"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routers_1 = __importDefault(require("./providers/api/routers"));
const app = (0, express_1.default)();
const port = 3002;
app.get('/', (req, res) => {
    console.log(routers_1.default, res);
    res.send(console.log(routers_1.default));
    res.send('Hello World!');
});
app.use(routers_1.default);
app.listen(port, () => {
    console.log(`Example app listening on pordasdast ${port}`);
});
