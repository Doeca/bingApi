import dotenv from 'dotenv-safe';
import { BingChat } from 'bing-chat';
import Koa from 'koa';
import Router from 'koa-router';
import { koaBody } from 'koa-body';
import { Base64 } from 'js-base64';
dotenv.config();
const app = new Koa();
const router = new Router();
const store = {};
router.post('/users', koaBody(), (ctx) => {
    console.log(ctx);
    console.log(ctx.request.body);
    // => POST body
    ctx.body = JSON.stringify(ctx.request.body);
});
router.post("/chat/:qqid", koaBody(), async (ctx) => {
    let qqid = ctx.params.qqid;
    let res = {};
    let session;
    let timestamp = Date.parse(new Date().toString()) / 1000;
    let msg = Base64.decode(ctx.request.body);
    res.msg = "";
    res.code = -1;
    if (qqid.trim() == "") {
        res.msg = "QQID错误";
        ctx.body = res;
        return;
    }
    else if (msg.trim() == "") {
        res.msg = "消息不能为空";
        ctx.body = res;
        return;
    }
    const api = new BingChat({ cookie: process.env.BING_COOKIE });
    if (store[qqid] != undefined)
        if (timestamp - store[qqid].startTime > 600) {
            delete store[qqid];
            res.msg = "【距上一次会话超过10分钟，会话已重置】\n";
        }
        else {
            session = store[qqid].session;
        }
    try {
        let rtx;
        if (session == null)
            rtx = await api.sendMessage(msg);
        else
            rtx = await api.sendMessage(msg, session);
        //console.log(rtx)
        res.code = 0;
        res.msg += rtx.text;
        if (rtx.text == '')
            res.msg = "【调用时出现错误，请稍后重试_Err1】";
        else {
            rtx.detail.sourceAttributions.forEach((v, i) => {
                let s = `[^${i + 1}^]`;
                let t = v.seeMoreUrl + "\n\n";
                if (v.imageLink != undefined)
                    t += `[CQ:image,file={v.imageLink}]`;
                res.msg = res.msg.replaceAll(s, t);
            });
        }
        if (store[qqid] == undefined)
            store[qqid] = { startTime: timestamp };
        store[qqid].session = rtx;
    }
    catch (error) {
        console.log(error);
        res.msg = "【调用时出现错误，请稍后重试_Err0】";
    }
    ctx.body = res;
});
router.get("/reset/:qqid", async (ctx) => {
    let qqid = ctx.params.qqid;
    let res = {};
    if (qqid.trim() == "") {
        res.code = -1;
        res.msg = "QQID错误";
        ctx.body = res;
        return;
    }
    if (store[qqid] != undefined) {
        delete store[qqid];
        res.msg = "会话已重置";
        res.code = 0;
        ctx.body = res;
        return;
    }
    res.msg = "会话列表中不存在此QQ";
    res.code = -1;
    ctx.body = res;
});
const port = 3003;
//app.use(cors())
app.use(router.routes());
console.log(`bing Api start listening at ${port}`);
app.listen(port);
