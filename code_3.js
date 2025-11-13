Error occurred at /
Port: 5173

Stack trace:
Error: You cannot render a <Router> inside another <Router>. You should never have more than one in your app.
    at invariant (node_modules/.vite/deps/react-router-dom.js?v=b863ab9d:527:11)
    at Router (node_modules/.vite/deps/react-router-dom.js?v=b863ab9d:6450:3)
    at renderWithHooks (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:11548:26)
    at mountIndeterminateComponent (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:14926:21)
    at beginWork (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:15914:22)
    at beginWork$1 (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:19753:22)
    at performUnitOfWork (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:19198:20)
    at workLoopSync (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:19137:13)
    at renderRootSync (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:19116:15)
    at recoverFromConcurrentError (node_modules/.vite/deps/chunk-WRD5HZVH.js?v=b863ab9d:18736:28)
