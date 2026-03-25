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
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! next/router */ \"./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var _utils_auth__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../utils/auth */ \"./utils/auth.ts\");\n/* harmony import */ var _utils_presence__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../utils/presence */ \"./utils/presence.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_utils_auth__WEBPACK_IMPORTED_MODULE_4__, _utils_presence__WEBPACK_IMPORTED_MODULE_5__]);\n([_utils_auth__WEBPACK_IMPORTED_MODULE_4__, _utils_presence__WEBPACK_IMPORTED_MODULE_5__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_3__.useRouter)();\n    const [loading, setLoading] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(true);\n    const [user, setUser] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)(null);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        const init = async ()=>{\n            const currentUser = await (0,_utils_auth__WEBPACK_IMPORTED_MODULE_4__.getCurrentUser)();\n            setUser(currentUser);\n            setLoading(false);\n            if (currentUser) {\n                (0,_utils_presence__WEBPACK_IMPORTED_MODULE_5__.startPresence)();\n            } else {\n                (0,_utils_presence__WEBPACK_IMPORTED_MODULE_5__.stopPresence)();\n            }\n            // Redirect to login if not authenticated and not on public pages\n            const publicPages = [\n                \"/login\",\n                \"/signup\"\n            ];\n            if (!currentUser && !publicPages.includes(router.pathname)) {\n                router.push(\"/login\");\n            }\n        };\n        init();\n        return ()=>{\n            (0,_utils_presence__WEBPACK_IMPORTED_MODULE_5__.stopPresence)();\n        };\n    }, [\n        router.pathname\n    ]);\n    if (loading) {\n        return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n            className: \"flex items-center justify-center min-h-screen\",\n            children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600\"\n            }, void 0, false, {\n                fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n                lineNumber: 40,\n                columnNumber: 9\n            }, this)\n        }, void 0, false, {\n            fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n            lineNumber: 39,\n            columnNumber: 7\n        }, this);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n        ...pageProps\n    }, void 0, false, {\n        fileName: \"C:\\\\Users\\\\abdelwahab.GLOBAL-ENERGY\\\\Desktop\\\\Desktop\\\\ticketing system\\\\client\\\\pages\\\\_app.tsx\",\n        lineNumber: 45,\n        columnNumber: 10\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi9wYWdlcy9fYXBwLnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDK0I7QUFDYTtBQUNKO0FBQ2E7QUFDVztBQUVqRCxTQUFTTSxJQUFJLEVBQUVDLFNBQVMsRUFBRUMsU0FBUyxFQUFZO0lBQzVELE1BQU1DLFNBQVNQLHNEQUFTQTtJQUN4QixNQUFNLENBQUNRLFNBQVNDLFdBQVcsR0FBR1YsK0NBQVFBLENBQUM7SUFDdkMsTUFBTSxDQUFDVyxNQUFNQyxRQUFRLEdBQUdaLCtDQUFRQSxDQUFjO0lBRTlDRCxnREFBU0EsQ0FBQztRQUNSLE1BQU1jLE9BQU87WUFDWCxNQUFNQyxjQUFjLE1BQU1aLDJEQUFjQTtZQUN4Q1UsUUFBUUU7WUFDUkosV0FBVztZQUNYLElBQUlJLGFBQWE7Z0JBQ2ZYLDhEQUFhQTtZQUNmLE9BQU87Z0JBQ0xDLDZEQUFZQTtZQUNkO1lBRUEsaUVBQWlFO1lBQ2pFLE1BQU1XLGNBQWM7Z0JBQUM7Z0JBQVU7YUFBVTtZQUN6QyxJQUFJLENBQUNELGVBQWUsQ0FBQ0MsWUFBWUMsUUFBUSxDQUFDUixPQUFPUyxRQUFRLEdBQUc7Z0JBQzFEVCxPQUFPVSxJQUFJLENBQUM7WUFDZDtRQUNGO1FBRUFMO1FBQ0EsT0FBTztZQUNMVCw2REFBWUE7UUFDZDtJQUNGLEdBQUc7UUFBQ0ksT0FBT1MsUUFBUTtLQUFDO0lBRXBCLElBQUlSLFNBQVM7UUFDWCxxQkFDRSw4REFBQ1U7WUFBSUMsV0FBVTtzQkFDYiw0RUFBQ0Q7Z0JBQUlDLFdBQVU7Ozs7Ozs7Ozs7O0lBR3JCO0lBRUEscUJBQU8sOERBQUNkO1FBQVcsR0FBR0MsU0FBUzs7Ozs7O0FBQ2pDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vdGlja2V0aW5nLWNsaWVudC8uL3BhZ2VzL19hcHAudHN4PzJmYmUiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBBcHBQcm9wcyB9IGZyb20gXCJuZXh0L2FwcFwiO1xuaW1wb3J0IFwiLi4vc3R5bGVzL2dsb2JhbHMuY3NzXCI7XG5pbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tIFwibmV4dC9yb3V0ZXJcIjtcbmltcG9ydCB7IGdldEN1cnJlbnRVc2VyLCBVc2VyIH0gZnJvbSBcIi4uL3V0aWxzL2F1dGhcIjtcbmltcG9ydCB7IHN0YXJ0UHJlc2VuY2UsIHN0b3BQcmVzZW5jZSB9IGZyb20gXCIuLi91dGlscy9wcmVzZW5jZVwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBBcHAoeyBDb21wb25lbnQsIHBhZ2VQcm9wcyB9OiBBcHBQcm9wcykge1xuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKTtcbiAgY29uc3QgW2xvYWRpbmcsIHNldExvYWRpbmddID0gdXNlU3RhdGUodHJ1ZSk7XG4gIGNvbnN0IFt1c2VyLCBzZXRVc2VyXSA9IHVzZVN0YXRlPFVzZXIgfCBudWxsPihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGluaXQgPSBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdXJyZW50VXNlciA9IGF3YWl0IGdldEN1cnJlbnRVc2VyKCk7XG4gICAgICBzZXRVc2VyKGN1cnJlbnRVc2VyKTtcbiAgICAgIHNldExvYWRpbmcoZmFsc2UpO1xuICAgICAgaWYgKGN1cnJlbnRVc2VyKSB7XG4gICAgICAgIHN0YXJ0UHJlc2VuY2UoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0b3BQcmVzZW5jZSgpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZWRpcmVjdCB0byBsb2dpbiBpZiBub3QgYXV0aGVudGljYXRlZCBhbmQgbm90IG9uIHB1YmxpYyBwYWdlc1xuICAgICAgY29uc3QgcHVibGljUGFnZXMgPSBbXCIvbG9naW5cIiwgXCIvc2lnbnVwXCJdO1xuICAgICAgaWYgKCFjdXJyZW50VXNlciAmJiAhcHVibGljUGFnZXMuaW5jbHVkZXMocm91dGVyLnBhdGhuYW1lKSkge1xuICAgICAgICByb3V0ZXIucHVzaChcIi9sb2dpblwiKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaW5pdCgpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBzdG9wUHJlc2VuY2UoKTtcbiAgICB9O1xuICB9LCBbcm91dGVyLnBhdGhuYW1lXSk7XG5cbiAgaWYgKGxvYWRpbmcpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtaW4taC1zY3JlZW5cIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhbmltYXRlLXNwaW4gcm91bmRlZC1mdWxsIGgtMTIgdy0xMiBib3JkZXItYi0yIGJvcmRlci1ibHVlLTYwMFwiPjwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiA8Q29tcG9uZW50IHsuLi5wYWdlUHJvcHN9IC8+O1xufVxuIl0sIm5hbWVzIjpbInVzZUVmZmVjdCIsInVzZVN0YXRlIiwidXNlUm91dGVyIiwiZ2V0Q3VycmVudFVzZXIiLCJzdGFydFByZXNlbmNlIiwic3RvcFByZXNlbmNlIiwiQXBwIiwiQ29tcG9uZW50IiwicGFnZVByb3BzIiwicm91dGVyIiwibG9hZGluZyIsInNldExvYWRpbmciLCJ1c2VyIiwic2V0VXNlciIsImluaXQiLCJjdXJyZW50VXNlciIsInB1YmxpY1BhZ2VzIiwiaW5jbHVkZXMiLCJwYXRobmFtZSIsInB1c2giLCJkaXYiLCJjbGFzc05hbWUiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./pages/_app.tsx\n");

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
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getCurrentUser: () => (/* binding */ getCurrentUser),\n/* harmony export */   getToken: () => (/* binding */ getToken),\n/* harmony export */   removeToken: () => (/* binding */ removeToken),\n/* harmony export */   setToken: () => (/* binding */ setToken)\n/* harmony export */ });\n/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! js-cookie */ \"js-cookie\");\n/* harmony import */ var _api__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./api */ \"./utils/api.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([js_cookie__WEBPACK_IMPORTED_MODULE_0__, _api__WEBPACK_IMPORTED_MODULE_1__]);\n([js_cookie__WEBPACK_IMPORTED_MODULE_0__, _api__WEBPACK_IMPORTED_MODULE_1__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\nconst setToken = (token)=>{\n    js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].set(\"token\", token, {\n        expires: 7\n    });\n};\nconst getToken = ()=>{\n    return js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].get(\"token\");\n};\nconst removeToken = ()=>{\n    js_cookie__WEBPACK_IMPORTED_MODULE_0__[\"default\"].remove(\"token\");\n};\nconst getCurrentUser = async ()=>{\n    try {\n        const token = getToken();\n        if (!token) return null;\n        const response = await _api__WEBPACK_IMPORTED_MODULE_1__[\"default\"].get(\"/auth/me\");\n        return response.data.user;\n    } catch (error) {\n        removeToken();\n        return null;\n    }\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi91dGlscy9hdXRoLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUFnQztBQUNSO0FBZ0JqQixNQUFNRSxXQUFXLENBQUNDO0lBQ3ZCSCxxREFBVyxDQUFDLFNBQVNHLE9BQU87UUFBRUUsU0FBUztJQUFFO0FBQzNDLEVBQUU7QUFFSyxNQUFNQyxXQUFXO0lBQ3RCLE9BQU9OLHFEQUFXLENBQUM7QUFDckIsRUFBRTtBQUVLLE1BQU1RLGNBQWM7SUFDekJSLHdEQUFjLENBQUM7QUFDakIsRUFBRTtBQUVLLE1BQU1VLGlCQUFpQjtJQUM1QixJQUFJO1FBQ0YsTUFBTVAsUUFBUUc7UUFDZCxJQUFJLENBQUNILE9BQU8sT0FBTztRQUVuQixNQUFNUSxXQUFXLE1BQU1WLGdEQUFPLENBQUM7UUFDL0IsT0FBT1UsU0FBU0MsSUFBSSxDQUFDQyxJQUFJO0lBQzNCLEVBQUUsT0FBT0MsT0FBTztRQUNkTjtRQUNBLE9BQU87SUFDVDtBQUNGLEVBQUUiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly90aWNrZXRpbmctY2xpZW50Ly4vdXRpbHMvYXV0aC50cz9iMzhhIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDb29raWVzIGZyb20gJ2pzLWNvb2tpZSc7XG5pbXBvcnQgYXBpIGZyb20gJy4vYXBpJztcblxuZXhwb3J0IGludGVyZmFjZSBVc2VyIHtcbiAgaWQ6IHN0cmluZztcbiAgZW1haWw6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICByb2xlOiAnVVNFUicgfCAnVEVDSE5JQ0lBTicgfCAnSVRfQURNSU4nIHwgJ0lUX01BTkFHRVInIHwgJ1NVUEVSX0FETUlOJztcbiAgc3BlY2lhbGl6YXRpb24/OiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBuYW1lOiBzdHJpbmc7XG4gIH07XG4gIHN0YXR1cz86ICdBVkFJTEFCTEUnIHwgJ0JVU1knIHwgJ09GRkxJTkUnO1xuICBpc09ubGluZT86IGJvb2xlYW47XG4gIG11c3RDaGFuZ2VQYXNzd29yZD86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBzZXRUb2tlbiA9ICh0b2tlbjogc3RyaW5nKSA9PiB7XG4gIENvb2tpZXMuc2V0KCd0b2tlbicsIHRva2VuLCB7IGV4cGlyZXM6IDcgfSk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0VG9rZW4gPSAoKSA9PiB7XG4gIHJldHVybiBDb29raWVzLmdldCgndG9rZW4nKTtcbn07XG5cbmV4cG9ydCBjb25zdCByZW1vdmVUb2tlbiA9ICgpID0+IHtcbiAgQ29va2llcy5yZW1vdmUoJ3Rva2VuJyk7XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0Q3VycmVudFVzZXIgPSBhc3luYyAoKTogUHJvbWlzZTxVc2VyIHwgbnVsbD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IHRva2VuID0gZ2V0VG9rZW4oKTtcbiAgICBpZiAoIXRva2VuKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXBpLmdldCgnL2F1dGgvbWUnKTtcbiAgICByZXR1cm4gcmVzcG9uc2UuZGF0YS51c2VyO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJlbW92ZVRva2VuKCk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn07XG5cbiJdLCJuYW1lcyI6WyJDb29raWVzIiwiYXBpIiwic2V0VG9rZW4iLCJ0b2tlbiIsInNldCIsImV4cGlyZXMiLCJnZXRUb2tlbiIsImdldCIsInJlbW92ZVRva2VuIiwicmVtb3ZlIiwiZ2V0Q3VycmVudFVzZXIiLCJyZXNwb25zZSIsImRhdGEiLCJ1c2VyIiwiZXJyb3IiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./utils/auth.ts\n");

/***/ }),

/***/ "./utils/presence.ts":
/*!***************************!*\
  !*** ./utils/presence.ts ***!
  \***************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   startPresence: () => (/* binding */ startPresence),\n/* harmony export */   stopPresence: () => (/* binding */ stopPresence)\n/* harmony export */ });\n/* harmony import */ var _auth__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./auth */ \"./utils/auth.ts\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_auth__WEBPACK_IMPORTED_MODULE_0__]);\n_auth__WEBPACK_IMPORTED_MODULE_0__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\nconst HEARTBEAT_MS = Number(process.env.NEXT_PUBLIC_PRESENCE_HEARTBEAT_MS || 15000);\nlet heartbeatTimer = null;\nlet socket = null;\nlet tabId = null;\nlet visibilityHandler = null;\nconst safeSendHeartbeat = ()=>{\n    if (!socket) return;\n    if (socket.readyState !== WebSocket.OPEN) return;\n    socket.send(JSON.stringify({\n        type: \"heartbeat\"\n    }));\n};\nconst postHeartbeat = async ()=>{\n    const token = (0,_auth__WEBPACK_IMPORTED_MODULE_0__.getToken)();\n    if (!token) return;\n    await fetch(`${\"http://localhost:5000/api\" || 0}/presence/heartbeat`, {\n        method: \"POST\",\n        headers: {\n            \"Content-Type\": \"application/json\",\n            Authorization: `Bearer ${token}`\n        },\n        body: JSON.stringify({\n            tabId\n        })\n    });\n};\nconst postDisconnect = ()=>{\n    const token = (0,_auth__WEBPACK_IMPORTED_MODULE_0__.getToken)();\n    if (!token || !tabId) return;\n    const payload = JSON.stringify({\n        tabId\n    });\n    const payloadWithToken = JSON.stringify({\n        tabId,\n        token\n    });\n    const url = `${\"http://localhost:5000/api\" || 0}/presence/disconnect`;\n    navigator.sendBeacon(url, new Blob([\n        payloadWithToken || payload\n    ], {\n        type: \"application/json\"\n    }));\n};\nconst startPresence = ()=>{\n    const token = (0,_auth__WEBPACK_IMPORTED_MODULE_0__.getToken)();\n    if (!token || \"undefined\" === \"undefined\") return;\n    tabId = crypto.randomUUID();\n    const wsBase = (\"http://localhost:5000/api\" || 0).replace(\"/api\", \"\").replace(\"http://\", \"ws://\").replace(\"https://\", \"wss://\");\n    socket = new WebSocket(`${wsBase}/ws/presence?token=${encodeURIComponent(token)}&tabId=${encodeURIComponent(tabId)}`);\n    socket.onopen = ()=>{\n        safeSendHeartbeat();\n    };\n    if (!heartbeatTimer) {\n        heartbeatTimer = setInterval(()=>{\n            postHeartbeat().catch(()=>undefined);\n            safeSendHeartbeat();\n        }, HEARTBEAT_MS);\n    }\n    window.addEventListener(\"pagehide\", postDisconnect);\n    visibilityHandler = ()=>{\n        if (document.visibilityState === \"hidden\") {\n            postDisconnect();\n        }\n    };\n    document.addEventListener(\"visibilitychange\", visibilityHandler);\n};\nconst stopPresence = ()=>{\n    if (heartbeatTimer) {\n        clearInterval(heartbeatTimer);\n        heartbeatTimer = null;\n    }\n    postDisconnect();\n    if (socket) {\n        socket.close();\n        socket = null;\n    }\n    if (visibilityHandler) {\n        document.removeEventListener(\"visibilitychange\", visibilityHandler);\n        visibilityHandler = null;\n    }\n};\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGdldFRva2VuIH0gZnJvbSAnLi9hdXRoJztcclxuXHJcbmNvbnN0IEhFQVJUQkVBVF9NUyA9IE51bWJlcihwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19QUkVTRU5DRV9IRUFSVEJFQVRfTVMgfHwgMTUwMDApO1xyXG5cclxubGV0IGhlYXJ0YmVhdFRpbWVyOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcclxubGV0IHNvY2tldDogV2ViU29ja2V0IHwgbnVsbCA9IG51bGw7XHJcbmxldCB0YWJJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcbmxldCB2aXNpYmlsaXR5SGFuZGxlcjogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcblxyXG5jb25zdCBzYWZlU2VuZEhlYXJ0YmVhdCA9ICgpID0+IHtcclxuICBpZiAoIXNvY2tldCkgcmV0dXJuO1xyXG4gIGlmIChzb2NrZXQucmVhZHlTdGF0ZSAhPT0gV2ViU29ja2V0Lk9QRU4pIHJldHVybjtcclxuICBzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeSh7IHR5cGU6ICdoZWFydGJlYXQnIH0pKTtcclxufTtcclxuXHJcbmNvbnN0IHBvc3RIZWFydGJlYXQgPSBhc3luYyAoKSA9PiB7XHJcbiAgY29uc3QgdG9rZW4gPSBnZXRUb2tlbigpO1xyXG4gIGlmICghdG9rZW4pIHJldHVybjtcclxuICBhd2FpdCBmZXRjaChgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19BUElfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjUwMDAvYXBpJ30vcHJlc2VuY2UvaGVhcnRiZWF0YCwge1xyXG4gICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0b2tlbn1gXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyB0YWJJZCB9KVxyXG4gIH0pO1xyXG59O1xyXG5cclxuY29uc3QgcG9zdERpc2Nvbm5lY3QgPSAoKSA9PiB7XHJcbiAgY29uc3QgdG9rZW4gPSBnZXRUb2tlbigpO1xyXG4gIGlmICghdG9rZW4gfHwgIXRhYklkKSByZXR1cm47XHJcbiAgY29uc3QgcGF5bG9hZCA9IEpTT04uc3RyaW5naWZ5KHsgdGFiSWQgfSk7XHJcbiAgY29uc3QgcGF5bG9hZFdpdGhUb2tlbiA9IEpTT04uc3RyaW5naWZ5KHsgdGFiSWQsIHRva2VuIH0pO1xyXG4gIGNvbnN0IHVybCA9IGAke3Byb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMC9hcGknfS9wcmVzZW5jZS9kaXNjb25uZWN0YDtcclxuICBuYXZpZ2F0b3Iuc2VuZEJlYWNvbih1cmwsIG5ldyBCbG9iKFtwYXlsb2FkV2l0aFRva2VuIHx8IHBheWxvYWRdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc3RhcnRQcmVzZW5jZSA9ICgpID0+IHtcclxuICBjb25zdCB0b2tlbiA9IGdldFRva2VuKCk7XHJcbiAgaWYgKCF0b2tlbiB8fCB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgcmV0dXJuO1xyXG4gIHRhYklkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcclxuXHJcbiAgY29uc3Qgd3NCYXNlID0gKHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMC9hcGknKVxyXG4gICAgLnJlcGxhY2UoJy9hcGknLCAnJylcclxuICAgIC5yZXBsYWNlKCdodHRwOi8vJywgJ3dzOi8vJylcclxuICAgIC5yZXBsYWNlKCdodHRwczovLycsICd3c3M6Ly8nKTtcclxuICBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KGAke3dzQmFzZX0vd3MvcHJlc2VuY2U/dG9rZW49JHtlbmNvZGVVUklDb21wb25lbnQodG9rZW4pfSZ0YWJJZD0ke2VuY29kZVVSSUNvbXBvbmVudCh0YWJJZCl9YCk7XHJcbiAgc29ja2V0Lm9ub3BlbiA9ICgpID0+IHtcclxuICAgIHNhZmVTZW5kSGVhcnRiZWF0KCk7XHJcbiAgfTtcclxuXHJcbiAgaWYgKCFoZWFydGJlYXRUaW1lcikge1xyXG4gICAgaGVhcnRiZWF0VGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XHJcbiAgICAgIHBvc3RIZWFydGJlYXQoKS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xyXG4gICAgICBzYWZlU2VuZEhlYXJ0YmVhdCgpO1xyXG4gICAgfSwgSEVBUlRCRUFUX01TKTtcclxuICB9XHJcblxyXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdwYWdlaGlkZScsIHBvc3REaXNjb25uZWN0KTtcclxuICB2aXNpYmlsaXR5SGFuZGxlciA9ICgpID0+IHtcclxuICAgIGlmIChkb2N1bWVudC52aXNpYmlsaXR5U3RhdGUgPT09ICdoaWRkZW4nKSB7XHJcbiAgICAgIHBvc3REaXNjb25uZWN0KCk7XHJcbiAgICB9XHJcbiAgfTtcclxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgdmlzaWJpbGl0eUhhbmRsZXIpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHN0b3BQcmVzZW5jZSA9ICgpID0+IHtcclxuICBpZiAoaGVhcnRiZWF0VGltZXIpIHtcclxuICAgIGNsZWFySW50ZXJ2YWwoaGVhcnRiZWF0VGltZXIpO1xyXG4gICAgaGVhcnRiZWF0VGltZXIgPSBudWxsO1xyXG4gIH1cclxuICBwb3N0RGlzY29ubmVjdCgpO1xyXG4gIGlmIChzb2NrZXQpIHtcclxuICAgIHNvY2tldC5jbG9zZSgpO1xyXG4gICAgc29ja2V0ID0gbnVsbDtcclxuICB9XHJcbiAgaWYgKHZpc2liaWxpdHlIYW5kbGVyKSB7XHJcbiAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd2aXNpYmlsaXR5Y2hhbmdlJywgdmlzaWJpbGl0eUhhbmRsZXIpO1xyXG4gICAgdmlzaWJpbGl0eUhhbmRsZXIgPSBudWxsO1xyXG4gIH1cclxufTtcclxuXHJcbiJdLCJuYW1lcyI6WyJnZXRUb2tlbiIsIkhFQVJUQkVBVF9NUyIsIk51bWJlciIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19QUkVTRU5DRV9IRUFSVEJFQVRfTVMiLCJoZWFydGJlYXRUaW1lciIsInNvY2tldCIsInRhYklkIiwidmlzaWJpbGl0eUhhbmRsZXIiLCJzYWZlU2VuZEhlYXJ0YmVhdCIsInJlYWR5U3RhdGUiLCJXZWJTb2NrZXQiLCJPUEVOIiwic2VuZCIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0eXBlIiwicG9zdEhlYXJ0YmVhdCIsInRva2VuIiwiZmV0Y2giLCJORVhUX1BVQkxJQ19BUElfVVJMIiwibWV0aG9kIiwiaGVhZGVycyIsIkF1dGhvcml6YXRpb24iLCJib2R5IiwicG9zdERpc2Nvbm5lY3QiLCJwYXlsb2FkIiwicGF5bG9hZFdpdGhUb2tlbiIsInVybCIsIm5hdmlnYXRvciIsInNlbmRCZWFjb24iLCJCbG9iIiwic3RhcnRQcmVzZW5jZSIsImNyeXB0byIsInJhbmRvbVVVSUQiLCJ3c0Jhc2UiLCJyZXBsYWNlIiwiZW5jb2RlVVJJQ29tcG9uZW50Iiwib25vcGVuIiwic2V0SW50ZXJ2YWwiLCJjYXRjaCIsInVuZGVmaW5lZCIsIndpbmRvdyIsImFkZEV2ZW50TGlzdGVuZXIiLCJkb2N1bWVudCIsInZpc2liaWxpdHlTdGF0ZSIsInN0b3BQcmVzZW5jZSIsImNsZWFySW50ZXJ2YWwiLCJjbG9zZSIsInJlbW92ZUV2ZW50TGlzdGVuZXIiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./utils/presence.ts\n");

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