/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/_app";
exports.ids = ["pages/_app"];
exports.modules = {

/***/ "./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _utils_auth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/auth */ \"./utils/auth.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_utils_auth__WEBPACK_IMPORTED_MODULE_4__]);\n_utils_auth__WEBPACK_IMPORTED_MODULE_4__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_3__.useRouter)();\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(true);\n    const [user, setUser] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(null);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        const init = async ()=>{\n            const currentUser = await (0,_utils_auth__WEBPACK_IMPORTED_MODULE_4__.getCurrentUser)();\n            setUser(currentUser);\n            setLoading(false);\n            // Redirect to login if not authenticated and not on public pages\n            const publicPages = [\n                \"/login\",\n                \"/signup\"\n            ];\n            if (!currentUser && !publicPages.includes(router.pathname)) {\n                router.push(\"/login\");\n            }\n        };\n        init();\n    }, [\n        router.pathname\n    ]);\n    if (loading) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"flex items-center justify-center min-h-screen\",\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600\"\n            }, void 0, false, {\n                fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n                lineNumber: 31,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n            lineNumber: 30,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n        ...pageProps\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n        lineNumber: 36,\n        columnNumber: 10\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUMrQjtBQUNhO0FBQ0o7QUFDTztBQUVoQyxTQUFTSSxJQUFJLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFZO0lBQzVELE1BQU1DLFNBQVNMLHNEQUFTQTtJQUN4QixNQUFNLENBQUNNLFNBQVNDLFdBQVcsR0FBR1IsK0NBQVFBLENBQUM7SUFDdkMsTUFBTSxDQUFDUyxNQUFNQyxRQUFRLEdBQUdWLCtDQUFRQSxDQUFDO0lBRWpDRCxnREFBU0EsQ0FBQztRQUNSLE1BQU1ZLE9BQU87WUFDWCxNQUFNQyxjQUFjLE1BQU1WLDJEQUFjQTtZQUN4Q1EsUUFBUUU7WUFDUkosV0FBVztZQUVYLGlFQUFpRTtZQUNqRSxNQUFNSyxjQUFjO2dCQUFDO2dCQUFVO2FBQVU7WUFDekMsSUFBSSxDQUFDRCxlQUFlLENBQUNDLFlBQVlDLFFBQVEsQ0FBQ1IsT0FBT1MsUUFBUSxHQUFHO2dCQUMxRFQsT0FBT1UsSUFBSSxDQUFDO1lBQ2Q7UUFDRjtRQUVBTDtJQUNGLEdBQUc7UUFBQ0wsT0FBT1MsUUFBUTtLQUFDO0lBRXBCLElBQUlSLFNBQVM7UUFDWCxxQkFDRSw4REFBQ1U7WUFBSUMsV0FBVTtzQkFDYiw0RUFBQ0Q7Z0JBQUlDLFdBQVU7Ozs7Ozs7Ozs7O0lBR3JCO0lBRUEscUJBQU8sOERBQUNkO1FBQVcsR0FBR0MsU0FBUzs7Ozs7O0FBQ2pDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGlja2V0aW5nLWNsaWVudC8uL3BhZ2VzL19hcHAudHN4PzJmYmUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gJ25leHQvYXBwJztcclxuaW1wb3J0ICcuLi9zdHlsZXMvZ2xvYmFscy5jc3MnO1xyXG5pbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xyXG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tICduZXh0L3JvdXRlcic7XHJcbmltcG9ydCB7IGdldEN1cnJlbnRVc2VyIH0gZnJvbSAnLi4vdXRpbHMvYXV0aCc7XHJcblxyXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xyXG4gIGNvbnN0IHJvdXRlciA9IHVzZVJvdXRlcigpO1xyXG4gIGNvbnN0IFtsb2FkaW5nLCBzZXRMb2FkaW5nXSA9IHVzZVN0YXRlKHRydWUpO1xyXG4gIGNvbnN0IFt1c2VyLCBzZXRVc2VyXSA9IHVzZVN0YXRlKG51bGwpO1xyXG5cclxuICB1c2VFZmZlY3QoKCkgPT4ge1xyXG4gICAgY29uc3QgaW5pdCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgY3VycmVudFVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xyXG4gICAgICBzZXRVc2VyKGN1cnJlbnRVc2VyKTtcclxuICAgICAgc2V0TG9hZGluZyhmYWxzZSk7XHJcblxyXG4gICAgICAvLyBSZWRpcmVjdCB0byBsb2dpbiBpZiBub3QgYXV0aGVudGljYXRlZCBhbmQgbm90IG9uIHB1YmxpYyBwYWdlc1xyXG4gICAgICBjb25zdCBwdWJsaWNQYWdlcyA9IFsnL2xvZ2luJywgJy9zaWdudXAnXTtcclxuICAgICAgaWYgKCFjdXJyZW50VXNlciAmJiAhcHVibGljUGFnZXMuaW5jbHVkZXMocm91dGVyLnBhdGhuYW1lKSkge1xyXG4gICAgICAgIHJvdXRlci5wdXNoKCcvbG9naW4nKTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBpbml0KCk7XHJcbiAgfSwgW3JvdXRlci5wYXRobmFtZV0pO1xyXG5cclxuICBpZiAobG9hZGluZykge1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtaW4taC1zY3JlZW5cIj5cclxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFuaW1hdGUtc3BpbiByb3VuZGVkLWZ1bGwgaC0xMiB3LTEyIGJvcmRlci1iLTIgYm9yZGVyLWJsdWUtNjAwXCI+PC9kaXY+XHJcbiAgICAgIDwvZGl2PlxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+O1xyXG59XHJcblxyXG4iXSwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJ1c2VSb3V0ZXIiLCJnZXRDdXJyZW50VXNlciIsIkFwcCIsIkNvbXBvbmVudCIsInBhZ2VQcm9wcyIsInJvdXRlciIsImxvYWRpbmciLCJzZXRMb2FkaW5nIiwidXNlciIsInNldFVzZXIiLCJpbml0IiwiY3VycmVudFVzZXIiLCJwdWJsaWNQYWdlcyIsImluY2x1ZGVzIiwicGF0aG5hbWUiLCJwdXNoIiwiZGl2IiwiY2xhc3NOYW1lIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

/***/ }),

/***/ "./utils/api.ts":
/*!**********************!*\
  !*** ./utils/api.ts ***!
  \**********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ \"axios\");\n/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! js-cookie */ \"js-cookie\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([axios__WEBPACK_IMPORTED_MODULE_0__, js_cookie__WEBPACK_IMPORTED_MODULE_1__]);\n([axios__WEBPACK_IMPORTED_MODULE_0__, js_cookie__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\nconst api = axios__WEBPACK_IMPORTED_MODULE_0__[\"default\"].create({\n    baseURL: \"http://localhost:5000/api\" || 0\n});\napi.interceptors.request.use((config)=>{\n    const token = js_cookie__WEBPACK_IMPORTED_MODULE_1__[\"default\"].get(\"token\");\n    if (token) {\n        config.headers.Authorization = `Bearer ${token}`;\n    }\n    return config;\n});\napi.interceptors.response.use((response)=>response, (error)=>{\n    if (error.response?.status === 401) {\n        js_cookie__WEBPACK_IMPORTED_MODULE_1__[\"default\"].remove(\"token\");\n        if (false) {}\n    }\n    return Promise.reject(error);\n});\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (api);\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi91dGlscy9hcGkudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQTBCO0FBQ007QUFFaEMsTUFBTUUsTUFBTUYsb0RBQVksQ0FBQztJQUN2QkksU0FBU0MsMkJBQStCLElBQUk7QUFDOUM7QUFFQUgsSUFBSU0sWUFBWSxDQUFDQyxPQUFPLENBQUNDLEdBQUcsQ0FBQyxDQUFDQztJQUM1QixNQUFNQyxRQUFRWCxxREFBVyxDQUFDO0lBQzFCLElBQUlXLE9BQU87UUFDVEQsT0FBT0csT0FBTyxDQUFDQyxhQUFhLEdBQUcsQ0FBQyxPQUFPLEVBQUVILE1BQU0sQ0FBQztJQUNsRDtJQUNBLE9BQU9EO0FBQ1Q7QUFFQVQsSUFBSU0sWUFBWSxDQUFDUSxRQUFRLENBQUNOLEdBQUcsQ0FDM0IsQ0FBQ00sV0FBYUEsVUFDZCxDQUFDQztJQUNDLElBQUlBLE1BQU1ELFFBQVEsRUFBRUUsV0FBVyxLQUFLO1FBQ2xDakIsd0RBQWMsQ0FBQztRQUNmLElBQUksS0FBa0IsRUFBYSxFQUVsQztJQUNIO0lBQ0EsT0FBT3NCLFFBQVFDLE1BQU0sQ0FBQ1A7QUFDeEI7QUFHRixpRUFBZWYsR0FBR0EsRUFBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3RpY2tldGluZy1jbGllbnQvLi91dGlscy9hcGkudHM/NmVkMCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXhpb3MgZnJvbSAnYXhpb3MnO1xyXG5pbXBvcnQgQ29va2llcyBmcm9tICdqcy1jb29raWUnO1xyXG5cclxuY29uc3QgYXBpID0gYXhpb3MuY3JlYXRlKHtcclxuICBiYXNlVVJMOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjUwMDAvYXBpJyxcclxufSk7XHJcblxyXG5hcGkuaW50ZXJjZXB0b3JzLnJlcXVlc3QudXNlKChjb25maWcpID0+IHtcclxuICBjb25zdCB0b2tlbiA9IENvb2tpZXMuZ2V0KCd0b2tlbicpO1xyXG4gIGlmICh0b2tlbikge1xyXG4gICAgY29uZmlnLmhlYWRlcnMuQXV0aG9yaXphdGlvbiA9IGBCZWFyZXIgJHt0b2tlbn1gO1xyXG4gIH1cclxuICByZXR1cm4gY29uZmlnO1xyXG59KTtcclxuXHJcbmFwaS5pbnRlcmNlcHRvcnMucmVzcG9uc2UudXNlKFxyXG4gIChyZXNwb25zZSkgPT4gcmVzcG9uc2UsXHJcbiAgKGVycm9yKSA9PiB7XHJcbiAgICBpZiAoZXJyb3IucmVzcG9uc2U/LnN0YXR1cyA9PT0gNDAxKSB7XHJcbiAgICAgIENvb2tpZXMucmVtb3ZlKCd0b2tlbicpO1xyXG4gICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvbG9naW4nO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xyXG4gIH1cclxuKTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGFwaTtcclxuXHJcbiJdLCJuYW1lcyI6WyJheGlvcyIsIkNvb2tpZXMiLCJhcGkiLCJjcmVhdGUiLCJiYXNlVVJMIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX0FQSV9VUkwiLCJpbnRlcmNlcHRvcnMiLCJyZXF1ZXN0IiwidXNlIiwiY29uZmlnIiwidG9rZW4iLCJnZXQiLCJoZWFkZXJzIiwiQXV0aG9yaXphdGlvbiIsInJlc3BvbnNlIiwiZXJyb3IiLCJzdGF0dXMiLCJyZW1vdmUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhyZWYiLCJQcm9taXNlIiwicmVqZWN0Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./utils/api.ts\n");

/***/ }),

/***/ "./utils/auth.ts":
/*!***********************!*\
  !*** ./utils/auth.ts ***!
  \***********************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getCurrentUser: () => (/* binding */ getCurrentUser),\n/* harmony export */   getToken: () => (/* binding */ getToken),\n/* harmony export */   removeToken: () => (/* binding */ removeToken),\n/* harmony export */   setToken: () => (/* binding */ setToken)\n/* harmony export */ });\n/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! js-cookie */ \"js-cookie\");\n/* harmony import */ var _api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api */ \"./utils/api.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([js_cookie__WEBPACK_IMPORTED_MODULE_0__, _api__WEBPACK_IMPORTED_MODULE_1__]);\n([js_cookie__WEBPACK_IMPORTED_MODULE_0__, _api__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\nconst setToken = (token)=>{\n    js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].set(\"token\", token, {\n        expires: 7\n    });\n};\nconst getToken = ()=>{\n    return js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].get(\"token\");\n};\nconst removeToken = ()=>{\n    js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].remove(\"token\");\n};\nconst getCurrentUser = async ()=>{\n    try {\n        const token = getToken();\n        if (!token) return null;\n        const response = await _api__WEBPACK_IMPORTED_MODULE_1__[\"default\"].get(\"/auth/me\");\n        return response.data.user;\n    } catch (error) {\n        removeToken();\n        return null;\n    }\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi91dGlscy9hdXRoLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFnQztBQUNSO0FBY2pCLE1BQU1FLFdBQVcsQ0FBQ0M7SUFDdkJILHFEQUFXLENBQUMsU0FBU0csT0FBTztRQUFFRSxTQUFTO0lBQUU7QUFDM0MsRUFBRTtBQUVLLE1BQU1DLFdBQVc7SUFDdEIsT0FBT04scURBQVcsQ0FBQztBQUNyQixFQUFFO0FBRUssTUFBTVEsY0FBYztJQUN6QlIsd0RBQWMsQ0FBQztBQUNqQixFQUFFO0FBRUssTUFBTVUsaUJBQWlCO0lBQzVCLElBQUk7UUFDRixNQUFNUCxRQUFRRztRQUNkLElBQUksQ0FBQ0gsT0FBTyxPQUFPO1FBRW5CLE1BQU1RLFdBQVcsTUFBTVYsZ0RBQU8sQ0FBQztRQUMvQixPQUFPVSxTQUFTQyxJQUFJLENBQUNDLElBQUk7SUFDM0IsRUFBRSxPQUFPQyxPQUFPO1FBQ2ROO1FBQ0EsT0FBTztJQUNUO0FBQ0YsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL3RpY2tldGluZy1jbGllbnQvLi91dGlscy9hdXRoLnRzP2IzOGEiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IENvb2tpZXMgZnJvbSAnanMtY29va2llJztcbmltcG9ydCBhcGkgZnJvbSAnLi9hcGknO1xuXG5leHBvcnQgaW50ZXJmYWNlIFVzZXIge1xuICBpZDogc3RyaW5nO1xuICBlbWFpbDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHJvbGU6ICdVU0VSJyB8ICdURUNITklDSUFOJyB8ICdJVF9BRE1JTicgfCAnSVRfTUFOQUdFUicgfCAnU1VQRVJfQURNSU4nO1xuICBzcGVjaWFsaXphdGlvbj86IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIG5hbWU6IHN0cmluZztcbiAgfTtcbiAgc3RhdHVzPzogJ0FWQUlMQUJMRScgfCAnQlVTWScgfCAnT0ZGTElORSc7XG59XG5cbmV4cG9ydCBjb25zdCBzZXRUb2tlbiA9ICh0b2tlbjogc3RyaW5nKSA9PiB7XG4gIENvb2tpZXMuc2V0KCd0b2tlbicsIHRva2VuLCB7IGV4cGlyZXM6IDcgfSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0VG9rZW4gPSAoKSA9PiB7XG4gIHJldHVybiBDb29raWVzLmdldCgndG9rZW4nKTtcbn07XG5cbmV4cG9ydCBjb25zdCByZW1vdmVUb2tlbiA9ICgpID0+IHtcbiAgQ29va2llcy5yZW1vdmUoJ3Rva2VuJyk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0Q3VycmVudFVzZXIgPSBhc3luYyAoKTogUHJvbWlzZTxVc2VyIHwgbnVsbD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHRva2VuID0gZ2V0VG9rZW4oKTtcbiAgICBpZiAoIXRva2VuKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXBpLmdldCgnL2F1dGgvbWUnKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YS51c2VyO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJlbW92ZVRva2VuKCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbiJdLCJuYW1lcyI6WyJDb29raWVzIiwiYXBpIiwic2V0VG9rZW4iLCJ0b2tlbiIsInNldCIsImV4cGlyZXMiLCJnZXRUb2tlbiIsImdldCIsInJlbW92ZVRva2VuIiwicmVtb3ZlIiwiZ2V0Q3VycmVudFVzZXIiLCJyZXNwb25zZSIsImRhdGEiLCJ1c2VyIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./utils/auth.ts\n");

/***/ }),

/***/ "./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = import("axios");;

/***/ }),

/***/ "js-cookie":
/*!****************************!*\
  !*** external "js-cookie" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = import("js-cookie");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc"], () => (__webpack_exec__("./pages/_app.tsx")));
module.exports = __webpack_exports__;

})();