// Monoxide Game Save Hook
// Injected into game HTML to track storage writes and handle save/load via postMessage
(function() {
  'use strict';

  // Track all localStorage keys written by the game
  var _trackedKeys = new Set();
  var _trackedIDBNames = new Set();

  // Wrap localStorage.setItem to track keys
  var _origSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    _trackedKeys.add(key);
    return _origSetItem.call(this, key, value);
  };

  // Also track removeItem
  var _origRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function(key) {
    _trackedKeys.delete(key);
    return _origRemoveItem.call(this, key);
  };

  // Wrap indexedDB.open to track database names
  var _origIDBOpen = indexedDB.open.bind(indexedDB);
  indexedDB.open = function(name, version) {
    _trackedIDBNames.add(name);
    return _origIDBOpen(name, version);
  };

  // Check if WASM memory restore is pending (set by parent before reload)
  var _pendingWasmRestore = null;
  try {
    var preload = sessionStorage.getItem('__monoxide_preload__');
    if (preload) {
      sessionStorage.removeItem('__monoxide_preload__');
      var data = JSON.parse(preload);
      if (data.localStorage) {
        Object.keys(data.localStorage).forEach(function(key) {
          localStorage.setItem(key, data.localStorage[key]);
        });
      }
      if (data.wasmMemory) {
        _pendingWasmRestore = data.wasmMemory;
      }
    }
  } catch(e) {}

  // If we have pending WASM memory to restore, hook into Module initialization
  if (_pendingWasmRestore) {
    var wasmData = _pendingWasmRestore;

    function doWasmRestore(mem) {
      try {
        var bytes = new Uint8Array(mem);
        var PAGE = wasmData.pageSize || 4096;
        // Zero the memory first
        bytes.fill(0);
        // Restore non-zero pages
        var pageKeys = Object.keys(wasmData.pages);
        for (var i = 0; i < pageKeys.length; i++) {
          var offset = parseInt(pageKeys[i]);
          var b64 = wasmData.pages[pageKeys[i]];
          var binary = atob(b64);
          for (var j = 0; j < binary.length && (offset + j) < bytes.length; j++) {
            bytes[offset + j] = binary.charCodeAt(j);
          }
        }
        return true;
      } catch(e) { return false; }
    }

    // Poll for Module to be ready, then restore memory
    var wasmRestoreAttempts = 0;
    var wasmRestoreInterval = setInterval(function() {
      wasmRestoreAttempts++;
      var mem = null;
      if (window.Module && window.Module.wasmMemory) mem = window.Module.wasmMemory.buffer;
      else if (window.unityInstance && window.unityInstance.Module && window.unityInstance.Module.wasmMemory) mem = window.unityInstance.Module.wasmMemory.buffer;
      else if (window.Module && window.Module.HEAPU8) mem = window.Module.HEAPU8.buffer;
      else if (window._Module && window._Module.wasmMemory) mem = window._Module.wasmMemory.buffer;

      if (mem) {
        clearInterval(wasmRestoreInterval);
        // Wait a tick for the game to finish init, then overwrite memory
        setTimeout(function() {
          var ok = doWasmRestore(mem);
          window.parent.postMessage({
            type: 'MONOXIDE_WASM_RESTORE',
            success: ok,
            totalSize: mem.byteLength,
            pagesRestored: Object.keys(wasmData.pages).length
          }, '*');
        }, 500);
      }

      if (wasmRestoreAttempts > 60) { // Give up after 30 seconds
        clearInterval(wasmRestoreInterval);
        window.parent.postMessage({ type: 'MONOXIDE_WASM_RESTORE', success: false, reason: 'timeout' }, '*');
      }
    }, 500);
  }

  // Binary-safe serialization for IDB values
  function encodeValue(val) {
    if (val instanceof ArrayBuffer || val instanceof Uint8Array) {
      var bytes = val instanceof ArrayBuffer ? new Uint8Array(val) : val;
      var binary = '';
      var chunk = 8192;
      for (var i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      return { __type: val instanceof ArrayBuffer ? 'ArrayBuffer' : 'Uint8Array', data: btoa(binary) };
    }
    if (val instanceof Blob) {
      return { __type: 'Blob', size: val.size };
    }
    if (val && typeof val === 'object' && !(val instanceof Date)) {
      if (Array.isArray(val)) return val.map(encodeValue);
      var out = {};
      Object.keys(val).forEach(function(k) { out[k] = encodeValue(val[k]); });
      return out;
    }
    return val;
  }

  function decodeValue(val) {
    if (val && typeof val === 'object') {
      if (val.__type === 'ArrayBuffer') {
        var bin = atob(val.data);
        var buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf.buffer;
      }
      if (val.__type === 'Uint8Array') {
        var bin = atob(val.data);
        var buf = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return buf;
      }
      if (val.__type === 'Blob') return new Uint8Array(0);
      if (Array.isArray(val)) return val.map(decodeValue);
      var out = {};
      Object.keys(val).forEach(function(k) { out[k] = decodeValue(val[k]); });
      return out;
    }
    return val;
  }

  function serializeIDB(dbName) {
    return new Promise(function(resolve, reject) {
      var req = indexedDB.open(dbName);
      req.onerror = function() { reject(new Error('Failed to open IDB: ' + dbName)); };
      req.onsuccess = function() {
        var db = req.result;
        var version = db.version;
        var storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) { db.close(); resolve({ version: version, stores: {} }); return; }

        var stores = {};
        var pending = storeNames.length;
        var tx = db.transaction(storeNames, 'readonly');

        storeNames.forEach(function(name) {
          var store = tx.objectStore(name);
          var schema = {
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            indexes: Array.from(store.indexNames).map(function(iName) {
              var idx = store.index(iName);
              return { name: idx.name, keyPath: idx.keyPath, unique: idx.unique, multiEntry: idx.multiEntry };
            })
          };
          var entries = [];
          var cursorReq = store.openCursor();
          cursorReq.onsuccess = function() {
            var cursor = cursorReq.result;
            if (cursor) {
              entries.push({ key: cursor.key, value: encodeValue(cursor.value) });
              cursor.continue();
            } else {
              stores[name] = { schema: schema, entries: entries };
              pending--;
              if (pending === 0) { db.close(); resolve({ version: version, stores: stores }); }
            }
          };
          cursorReq.onerror = function() {
            stores[name] = { schema: schema, entries: [] };
            pending--;
            if (pending === 0) { db.close(); resolve({ version: version, stores: stores }); }
          };
        });
      };
    });
  }

  function restoreIDB(dbName, data) {
    var storeNames = Object.keys(data.stores);
    if (storeNames.length === 0) return Promise.resolve();

    return new Promise(function(resolve, reject) {
      // Try to delete first
      var delReq = indexedDB.deleteDatabase(dbName);
      delReq.onsuccess = doOpen;
      delReq.onerror = doOpen;
      delReq.onblocked = doOpen;

      function doOpen() {
        var req = indexedDB.open(dbName, data.version);
        req.onupgradeneeded = function() {
          var db = req.result;
          storeNames.forEach(function(storeName) {
            if (!db.objectStoreNames.contains(storeName)) {
              var s = data.stores[storeName].schema;
              var opts = {};
              if (s.keyPath !== null && s.keyPath !== undefined) opts.keyPath = s.keyPath;
              opts.autoIncrement = s.autoIncrement;
              var store = db.createObjectStore(storeName, opts);
              s.indexes.forEach(function(idx) {
                store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multiEntry });
              });
            }
          });
        };
        req.onsuccess = function() {
          var db = req.result;
          var existingStores = storeNames.filter(function(s) { return db.objectStoreNames.contains(s); });
          if (existingStores.length === 0) { db.close(); resolve(); return; }

          var tx = db.transaction(existingStores, 'readwrite');
          existingStores.forEach(function(storeName) {
            var store = tx.objectStore(storeName);
            var storeData = data.stores[storeName];
            store.clear();
            storeData.entries.forEach(function(entry) {
              try {
                var decoded = decodeValue(entry.value);
                if (storeData.schema.keyPath) {
                  store.put(decoded);
                } else {
                  store.put(decoded, entry.key);
                }
              } catch(e) {}
            });
          });
          tx.oncomplete = function() { db.close(); resolve(); };
          tx.onerror = function() { db.close(); resolve(); };
        };
        req.onerror = function() { reject(new Error('Failed to restore IDB: ' + dbName)); };
      }
    });
  }

  // Monoxide keys to exclude from capture
  var MONOXIDE_PREFIXES = ['monoxide-', 'sb-', 'supabase.auth', 'theme', 'ally-supports', 'next', '__monoxide', 'bare-mux', 'gd_'];
  function isMonoxideKey(key) {
    return MONOXIDE_PREFIXES.some(function(p) { return key.startsWith(p); });
  }
  // Databases to exclude: Monoxide internals + cached assets + analytics
  var MONOXIDE_IDB = ['supabase', 'keyval-store', 'workbox', 'monoxide-wasm'];
  // Databases that are cached game engines/assets, NOT save data
  var CACHE_IDB = [
    'EmulatorJS-core', 'EmulatorJS-roms', 'EmulatorJS',
    'UnityCache',
    'firebase-installations-database', 'firebaseLocalStorageDb', 'firebase_remote_config',
    '__op',                // Firebase operation queue
    '/idbfs-test',         // Empty Emscripten test DB
  ];
  function isCacheDB(name) {
    return CACHE_IDB.some(function(n) { return name === n; });
  }
  function isMonoxideDB(name) {
    return MONOXIDE_IDB.some(function(n) { return name.toLowerCase().includes(n); });
  }

  // Also scan existing localStorage keys on init (game may have saved previously)
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (k && !isMonoxideKey(k)) _trackedKeys.add(k);
  }

  // Listen for save/load commands from parent
  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'MONOXIDE_SAVE_REQUEST') {
      // Gather all game localStorage data
      var ls = {};
      var allKeys = new Set(_trackedKeys);
      // Also scan current localStorage for any keys we missed
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && !isMonoxideKey(key)) allKeys.add(key);
      }
      allKeys.forEach(function(key) {
        var val = localStorage.getItem(key);
        if (val !== null) ls[key] = val;
      });

      // Gather IndexedDB
      var idbPromise;
      if (indexedDB.databases) {
        idbPromise = indexedDB.databases().then(function(dbs) {
          var gameDbs = dbs.filter(function(d) { return d.name && !isMonoxideDB(d.name) && !isCacheDB(d.name); });
          // Also include tracked DBs
          _trackedIDBNames.forEach(function(name) {
            if (!isMonoxideDB(name) && !isCacheDB(name) && !gameDbs.some(function(d) { return d.name === name; })) {
              gameDbs.push({ name: name });
            }
          });
          var idb = {};
          return Promise.all(gameDbs.map(function(db) {
            return serializeIDB(db.name).then(function(schema) {
              idb[db.name] = schema;
            }).catch(function() {});
          })).then(function() { return idb; });
        });
      } else {
        // Fallback: serialize tracked DBs only
        var idb = {};
        var trackedArr = Array.from(_trackedIDBNames).filter(function(n) { return !isMonoxideDB(n) && !isCacheDB(n); });
        idbPromise = Promise.all(trackedArr.map(function(name) {
          return serializeIDB(name).then(function(schema) {
            idb[name] = schema;
          }).catch(function() {});
        })).then(function() { return idb; });
      }

      idbPromise.then(function(idb) {
        // Capture cookies
        var cookies = document.cookie || '';

        // Attempt to capture WASM memory (Emscripten/Unity/SDL games)
        var wasmMemory = null;
        var wasmEngine = null;
        try {
          var mem = null;
          // Emscripten Module
          if (window.Module && window.Module.wasmMemory) {
            mem = window.Module.wasmMemory.buffer;
            wasmEngine = 'emscripten';
          }
          // Unity WebGL
          else if (window.unityInstance && window.unityInstance.Module && window.unityInstance.Module.wasmMemory) {
            mem = window.unityInstance.Module.wasmMemory.buffer;
            wasmEngine = 'unity';
          }
          // GameMaker HTML5 (uses buffer)
          else if (window.Module && window.Module.HEAPU8) {
            mem = window.Module.HEAPU8.buffer;
            wasmEngine = 'emscripten';
          }
          // Search for Module in iframes or global scope
          else if (window._Module && window._Module.wasmMemory) {
            mem = window._Module.wasmMemory.buffer;
            wasmEngine = 'emscripten';
          }

          if (mem) {
            var bytes = new Uint8Array(mem);
            // Compress: only store non-zero pages (4KB chunks)
            var PAGE = 4096;
            var pages = {};
            for (var p = 0; p < bytes.length; p += PAGE) {
              var chunk = bytes.subarray(p, Math.min(p + PAGE, bytes.length));
              var allZero = true;
              for (var b = 0; b < chunk.length; b++) {
                if (chunk[b] !== 0) { allZero = false; break; }
              }
              if (!allZero) {
                var binary = '';
                for (var b = 0; b < chunk.length; b++) binary += String.fromCharCode(chunk[b]);
                pages[p] = btoa(binary);
              }
            }
            wasmMemory = {
              engine: wasmEngine,
              totalSize: mem.byteLength,
              pages: pages,
              pageSize: PAGE,
              pageCount: Object.keys(pages).length
            };
          }
        } catch(e) {}

        var saveData = {
          localStorage: ls,
          indexedDB: idb,
          cookies: cookies,
          wasmMemory: wasmMemory,
          trackedKeys: Array.from(allKeys),
          trackedDBs: Array.from(_trackedIDBNames),
          timestamp: Date.now()
        };
        // Build IDB summary with entry counts
        var idbSummary = {};
        Object.keys(idb).forEach(function(dbName) {
          var totalEntries = 0;
          Object.keys(idb[dbName].stores || {}).forEach(function(storeName) {
            totalEntries += (idb[dbName].stores[storeName].entries || []).length;
          });
          idbSummary[dbName] = {
            version: idb[dbName].version,
            stores: Object.keys(idb[dbName].stores || {}).length,
            entries: totalEntries
          };
        });

        window.parent.postMessage({
          type: 'MONOXIDE_SAVE_RESPONSE',
          saveData: saveData,
          lsKeyCount: Object.keys(ls).length,
          lsKeys: Object.keys(ls),
          idbCount: Object.keys(idb).length,
          idbNames: Object.keys(idb),
          idbSummary: idbSummary,
          wasmInfo: wasmMemory ? {
            engine: wasmMemory.engine,
            totalSize: wasmMemory.totalSize,
            pageCount: wasmMemory.pageCount,
            compressedPages: Object.keys(wasmMemory.pages).length
          } : null
        }, '*');
      }).catch(function(err) {
        window.parent.postMessage({
          type: 'MONOXIDE_SAVE_RESPONSE',
          error: err.message
        }, '*');
      });
    }

    if (event.data.type === 'MONOXIDE_LOAD_REQUEST') {
      var saveData = event.data.saveData;
      if (!saveData) return;

      // Restore localStorage
      if (saveData.localStorage) {
        // Clear game keys first
        var keysToRemove = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && !isMonoxideKey(key)) keysToRemove.push(key);
        }
        keysToRemove.forEach(function(key) { localStorage.removeItem(key); });

        // Write saved data
        Object.keys(saveData.localStorage).forEach(function(key) {
          localStorage.setItem(key, saveData.localStorage[key]);
        });
      }

      // Restore IndexedDB then reload
      var idbPromise = Promise.resolve();
      if (saveData.indexedDB && Object.keys(saveData.indexedDB).length > 0) {
        var dbNames = Object.keys(saveData.indexedDB);
        idbPromise = Promise.all(dbNames.map(function(dbName) {
          return restoreIDB(dbName, saveData.indexedDB[dbName]).catch(function() {});
        }));
      }

      idbPromise.then(function() {
        // Restore cookies
        if (saveData.cookies) {
          saveData.cookies.split(';').forEach(function(c) {
            var trimmed = c.trim();
            if (trimmed) document.cookie = trimmed;
          });
        }

        window.parent.postMessage({ type: 'MONOXIDE_LOAD_COMPLETE' }, '*');
        // Reload so the game reads the restored data
        location.reload();
      });
    }

    if (event.data.type === 'MONOXIDE_PING') {
      window.parent.postMessage({ type: 'MONOXIDE_PONG' }, '*');
    }
  });

  // Track cookie changes
  var _cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                    Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
  var _trackedCookies = false;
  if (_cookieDesc && _cookieDesc.set) {
    var _origCookieSet = _cookieDesc.set;
    Object.defineProperty(document, 'cookie', {
      get: function() { return _cookieDesc.get.call(this); },
      set: function(val) { _trackedCookies = true; return _origCookieSet.call(this, val); },
      configurable: true
    });
  }

  // Signal to parent that hook is loaded
  window.parent.postMessage({ type: 'MONOXIDE_HOOK_READY' }, '*');
})();
