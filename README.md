# 疑云牌局 · 免费独立托管版

2–6 人中文好友联机桌游。前端使用 React，后台为单进程 Node.js；不依赖 ChatGPT Sites、Cloudflare D1、外部字体或付费数据库。访客无需账号，房间手牌由服务器保密，支持行动、质疑、阻挡、换牌和胜负判定。

## 本地运行

需要 Node.js 22.14 或更高版本。

```sh
npm ci
npm run build
npm start
```

打开 http://localhost:3000 。也可设置 `PORT` 环境变量。

```sh
npm run check
npm test
```

## Render Free 部署

1. 将本项目作为一个 Git 仓库推送到你的 GitHub 账号。
2. 在 Render 创建 Web Service 并选择该仓库，或使用仓库内的 `render.yaml` 创建 Blueprint。
3. 运行环境：Node；Build Command：`npm ci && npm run build`；Start Command：`npm start`；Health Check：`/healthz`。
4. **实例必须选 Free**。区域可选 Singapore（新加坡）；只运行一个实例。
5. 使用 Render 提供的免费 `onrender.com` 域名，无需购买域名。不要选择付费数据库、磁盘或付费实例。为避免超额扣费，不添加支付方式；如平台要求付款信息或升级，先停止。
6. 部署后用实际手机网络打开网址，创建房间并邀请第二位玩家，确认网络可达和状态同步后再使用。

免费档详情：https://render.com/docs/free

## 需要了解的免费档限制

- 空闲 15 分钟后休眠，下一次访问约需一分钟唤醒。
- 牌局保存在内存中。服务休眠、重启、更新时，旧房间会丢失，需重新开房；进行中的活跃轮询会持续发送请求。
- 房间在最后一次操作 24 小时后失效；单服务最多保留 1000 间房。
- 免费档有月度运行时间、流量和构建额度；以平台当前政策为准。
- 新平台链接在中国大陆各网络的可达性仍需实际测试，不能把更换域名当作访问保证。

## 部署状态

此压缩包是已构建、已测试的迁移代码，**本身不代表已经发布到 Render**。发布需要授权连接你的 Render 账号，以及一个可由 Render 访问的源码仓库。不要向聊天发送密码或 API 密钥。
