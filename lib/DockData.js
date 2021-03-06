"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
/** @ignore */
exports.defaultGroup = {
    floatable: true,
};
/** @ignore */
exports.placeHolderStyle = 'place-holder';
/** @ignore */
exports.placeHolderGroup = {
    floatable: false,
};
/** @ignore */
exports.DockContextType = react_1.default.createContext(null);
/** @ignore */
exports.DockContextProvider = exports.DockContextType.Provider;
/** @ignore */
exports.DockContextConsumer = exports.DockContextType.Consumer;
//# sourceMappingURL=DockData.js.map