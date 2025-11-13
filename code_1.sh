npm run dev
fatal
error: too many writes on closed pipe
goroutine 6 [running]: runtime.throw({0xa2669, 0x1e})
runtime/panic.go:1047 +0x3 fp=0x83aed8 sp=0x83aeb0 pc=0x12250003
os.sigpipe()
runtime/os_js.go
> vite-shadcn@0.0.0 dev
> vite
:144 +0x2 fp=0x83aef0 sp=0x83aed8 pc=0x13b70002
os.epipecheck(...)
os/file_unix.go:224
os.(*File).Write(0x80c020, {0x927800, 0xb63, 0xc00})
os/file.go:183 +0x2d fp=0x83af78 sp=0x83aef0 pc=0x160f002d
main.runService.func1()
github.com/evanw/esbuild/cmd/esbuild/service.go:99 +0x7 fp=0x83afe0 sp=0x83af78 pc=0x1ff30007
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x83afe8 sp=0x83afe0 pc=0x14070001
created by main.runService
github.com/evanw/esbuild/cmd/esbuild/service.go:97 +0x1e
goroutine 1 [chan receive]: runtime.gopark(0xbbfa8, 0x830418, 0xe, 0x17, 0x2)
runtime/proc.go:381 +0x28 fp=0x897928 sp=0x897900 pc=0x124c0028
runtime.chanrecv(0x8303c0, 0x897a58, 0x1)
runtime/chan.go:583 +0x7f fp=0x8979b0 sp=0x897928 pc=0x106d007f
runtime.chanrecv1(0x8303c0, 0x897a58)
runtime/chan.go:442 +0x2 fp=0x8979d8 sp=0x8979b0 pc=0x106b0002
syscall.fsCall({0x93d40, 0x4}, {0x897b40, 0x5, 0x5})
syscall/fs_js.go:520 +0x13 fp=0x897aa8 sp=0x8979d8 pc=0x15a70013
syscall.Read(0x0, {0x8c6000, 0x4000, 0x4000})
syscall/fs_js.go:388 +0xb fp=0x897b98 sp=0x897aa8 pc=0x15a3000b
internal/poll.ignoringEINTRIO(...)
internal/poll/fd_unix.go:794
internal/poll.(*FD).Read(0x830060, {0x8c6000, 0x4000, 0x4000})
internal/poll/fd_unix.go:163 +0x57 fp=0x897c30 sp=0x897b98 pc=0x15f60057
os.(*File).read(...)
os/file_posix.go:31
os.(*File).Read(0x80c018, {0x8c6000, 0x4000, 0x4000})
os/file.go:118 +0x12 fp=0x897ca8 sp=0x897c30 pc=0x160d0012
main.runService(0x1)
github.com/evanw/esbuild/cmd/esbuild/service.go:134 +0x46 fp=0x897df0 sp=0x897ca8 pc=0x1ff00046
main.main()
github.com/evanw/esbuild/cmd/esbuild/main.go:241 +0xa0 fp=0x897f88 sp=0x897df0 pc=0x1fe900a0
runtime.main()
runtime/proc.go:250 +0x32 fp=0x897fe0 sp=0x897f88 pc=0x12460032
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x897fe8 sp=0x897fe0 pc=0x14070001
goroutine 2 [force gc (idle)]: runtime.gopark(0xbc140, 0x3ef840, 0x11, 0x14, 0x1)
runtime/proc.go:381 +0x28 fp=0x828fb8 sp=0x828f90 pc=0x124c0028
runtime.goparkunlock(...)
runtime/proc.go:387
runtime.forcegchelper()
runtime/proc.go:305 +0x1f fp=0x828fe0 sp=0x828fb8 pc=0x1249001f
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x828fe8 sp=0x828fe0 pc=0x14070001
created by runtime.init.5
runtime/proc.go:293 +0x2
goroutine 3 [GC sweep wait]: runtime.gopark(0xbc140, 0x3efbc0, 0xc, 0x14, 0x1)
runtime/proc.go:381 +0x28 fp=0x829798 sp=0x829770 pc=0x124c0028
runtime.goparkunlock(...)
runtime/proc.go:387
runtime.bgsweep(0x82e000)
runtime/mgcsweep.go:278 +0xf fp=0x8297d0 sp=0x829798 pc=0x1179000f
runtime.gcenable.func1()
runtime/mgc.go:178 +0x2 fp=0x8297e0 sp=0x8297d0 pc=0x110d0002
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x8297e8 sp=0x8297e0 pc=0x14070001
created by runtime.gcenable
runtime/mgc.go:178 +0x8
goroutine 4 [GC scavenge wait]: runtime.gopark(0xbc140, 0x3efe00, 0xd, 0x14, 0x2)
runtime/proc.go:381 +0x28 fp=0x829f80 sp=0x829f58 pc=0x124c0028
runtime.goparkunlock(...)
runtime/proc.go:387
runtime.(*scavengerState).park(0x3efe00)
runtime/mgcscavenge.go:400 +0xd fp=0x829fa8 sp=0x829f80 pc=0x1160000d
runtime.bgscavenge(0x82e000)
runtime/mgcscavenge.go:628 +0x4 fp=0x829fd0 sp=0x829fa8 pc=0x11650004
runtime.gcenable.func2()
runtime/mgc.go:179 +0x2 fp=0x829fe0 sp=0x829fd0 pc=0x110c0002
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x829fe8 sp=0x829fe0 pc=0x14070001
created by runtime.gcenable
runtime/mgc.go:179 +0xe
goroutine 5 [finalizer wait]: runtime.gopark(0xbbfe0, 0x40cab0, 0x10, 0x14, 0x1)
runtime/proc.go:381 +0x28 fp=0x828738 sp=0x828710 pc=0x124c0028
runtime.runfinq()
runtime/mfinal.go:193 +0x1f fp=0x8287e0 sp=0x828738 pc=0x1104001f
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x8287e8 sp=0x8287e0 pc=0x14070001
created by runtime.createfing
runtime/mfinal.go:163 +0xd
goroutine 7 [waiting]: runtime.gopark(0x0, 0x0, 0x0, 0x0, 0x1)
runtime/proc.go:381 +0x28 fp=0x82af90 sp=0x82af68 pc=0x124c0028
runtime.handleEvent()
runtime/lock_js.go:257 +0x1b fp=0x82afe0 sp=0x82af90 pc=0x10a3001b
runtime.goexit()
runtime/asm_wasm.s:399 +0x1 fp=0x82afe8 sp=0x82afe0 pc=0x14070001
created by runtime.beforeIdle
runtime/lock_js.go:207 +0x1a
goroutine 8 [sleep]: runtime.gopark(0xbc180, 0x832190, 0x13, 0x13, 0x1)
runtime/proc.go:381 +0x28 fp=0x82b768 sp=0x82b740 pc=0x124c0028
time.Sleep(0x3b9aca00)
runtime/time.go:195 +0x1b fp=0x82b7a0 sp=0x82b768 pc=0x13d6001b
main.runService.func3()
github.com/evanw/esbuild/cmd/esbuild/service.go:124 +0x5 fp=0x82b7e0 sp=0x82b7a0 pc=0x1ff10005
runtime.goexit()
runtime/asm_wasm.s:399Re-optimizing dependencies because vite config has changed
VITE v5.4.20 ready in 690 ms
➜ Local: http://localhost:5173/
➜ Network: use --host to expose
➜ press h + enter to show help
warn - The `content` option in your Tailwind CSS configuration is missing or empty.
warn - Configure your content sources or your generated CSS will be missing styles.
warn - https://tailwindcss.com/docs/content-configuration
23:56:10 [vite] Pre-transform
error: [postcss] /home/project/src/index.css:1:1: The `border-border` class does not exist. If `border-border` is a custom class, make sure it is defined within a `@layer` directive.
23:56:10 [vite] Pre-transform
error: Failed to resolve import "./pages/invoicing/ResumenDiarioPage" from "src/App.tsx". Does the file exist?
23:56:11 [vite] Internal server
error: [postcss] /home/project/src/index.css:1:1: The `border-border` class does not exist. If `border-border` is a custom class, make sure it is defined within a `@layer` directive.
Plugin: vite:css
File: /home/project/src/index.css:1:0
1 | @tailwind base;
| ^
2 | @tailwind components;
3 | @tailwind utilities;
at Input.error (/home/project/node_modules/postcss/lib/input.js:135:16)
at AtRule.error (/home/project/node_modules/postcss/lib/node.js:146:32)
at processApply (/home/project/node_modules/tailwindcss/lib/lib/expandApplyAtRules.js:380:29)
at eval (/home/project/node_modules/tailwindcss/lib/lib/expandApplyAtRules.js:551:9)
at eval (/home/project/node_modules/tailwindcss/lib/processTailwindFeatures.js:55:50)
at async plugins (/home/project/node_modules/tailwindcss/lib/plugin.js:38:17)
at async LazyResult.runAsync (/home/project/node_modules/postcss/lib/lazy-result.js:293:11)
at async compileCSS (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:36948:21)
at async TransformPluginContext.transform (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:36221:11)
at async PluginContainer.transform (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:49149:18)
23:56:11 [vite] Internal server
error: Failed to resolve import "./pages/invoicing/ResumenDiarioPage" from "src/App.tsx". Does the file exist?
Plugin: vite:import-analysis
File: /home/project/src/App.tsx:14:30
29 | import InvoicingLayout from "./pages/invoicing/InvoicingLayout";
30 | import BoletasPage from "./pages/invoicing/BoletasPage";
31 | import ResumenDiarioPage from "./pages/invoicing/ResumenDiarioPage";
| ^
32 | import { useEffect } from "react";
33 | import { supabase } from "./lib/supabaseClient";
at TransformPluginContext._formatError (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:49308:41)
at TransformPluginContext.error (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:49303:16)
at normalizeUrl (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:64356:23)
at async eval (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:64488:39)
at async TransformPluginContext.transform (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:64415:7)
at async PluginContainer.transform (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:49149:18)
at async loadAndTransform (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:52027:27)
at async viteTransformMiddleware (file:///home/project/node_modules/vite/dist/node/chunks/dep-D_zLpgQd.js:62155:24)
^C
