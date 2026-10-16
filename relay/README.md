# 手机同步 · 公网中转服务

把电脑上的截图模式解答、对话模式提示转发到手机浏览器，手机不在同一个 Wi-Fi 下也能看。

```
电脑上的应用 ──(WebSocket /host, 带密钥)──▶ 中转服务 ◀──(WebSocket /view, 带二维码里的令牌)── 手机浏览器
```

- 电脑是唯一的数据来源，每次变化把完整状态推上来；中转服务只保留最新一份，晚打开的手机也能马上看到当前内容。不存盘，重启即清空
- 一个密钥 `RELAY_KEY`：电脑用它连接；手机用由它算出的令牌（HMAC，放在二维码链接的 `#t=` 里），拿到令牌只能看，推不了内容，也反推不出密钥
- 同一个密钥同一时间只认一台电脑，另一台连上会把前一台顶掉（前一台显示「同一密钥已在另一台电脑上连接」）
- 依赖只有 [`ws`](https://github.com/websockets/ws)，Node 20 以上

## 1. 生成密钥

```bash
openssl rand -hex 16
```

得到 32 位的一串，下面记作 `<密钥>`。至少 16 位，别用好猜的。

## 2. 部署（二选一）

先把本目录传到服务器（在项目根目录执行，`node_modules` 不用传）：

```bash
tar --exclude=node_modules -czf relay.tgz relay
scp relay.tgz <服务器>:~
ssh <服务器> 'tar -xzf relay.tgz'
```

### 方式 A：Docker

```bash
cd ~/relay
echo 'RELAY_KEY=<密钥>' > .env
docker compose up -d --build
docker compose logs -f        # 看到 relay listening on :8787 即可
```

拉不下 `node:22-alpine`（国内服务器访问 Docker Hub 常超时）时，给 Docker 配镜像加速（阿里云控制台 → 容器镜像服务 → 镜像加速器），或直接用方式 B。

更新：重新上传后 `docker compose up -d --build`。

### 方式 B：直接用 Node

```bash
cd ~/relay
npm ci --omit=dev
RELAY_KEY=<密钥> node server.mjs
```

长期运行可以交给 systemd，新建 `/etc/systemd/system/ic-relay.service`（路径和用户按实际改）：

```ini
[Unit]
Description=Interview Coder relay
After=network.target

[Service]
WorkingDirectory=/root/relay
Environment=RELAY_KEY=<密钥>
ExecStart=/usr/bin/node server.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now ic-relay
journalctl -u ic-relay -f
```

### 可选环境变量

| 变量          | 默认     | 说明                 |
| ------------- | -------- | -------------------- |
| `RELAY_KEY`   | （必填） | 至少 16 位           |
| `PORT`        | `8787`   | 监听端口             |
| `MAX_VIEWERS` | `10`     | 同时在看的手机数上限 |

## 3. 放行端口

阿里云控制台 → 云服务器 ECS → 安全组 → 入方向，添加 TCP `8787`，授权对象 `0.0.0.0/0`。服务器上如果开了 `ufw` / `firewalld`，也要放行。

检查：浏览器打开 `http://<服务器IP>:8787/healthz`，显示 `ok` 就通了。

## 4. 电脑端设置

设置 → 手机同步 → 打开「公网中转」：

- 服务器地址：`http://<服务器IP>:8787`
- 密钥：`<密钥>`

显示「已就绪」后出现二维码，手机扫码打开即可。手机右上角的状态：「已连接」正常；「电脑离线」是中转服务在、电脑没连上；「已断开，重连中」是手机连不上服务器，会自动重试；「链接失效」是密钥换过了，重新扫码。

更换密钥：服务器和电脑都改成新的，之前扫过的手机链接随即失效。

手机打不开时，先用手机浏览器打开 `http://<服务器IP>:8787/healthz`：打不开是安全组 / 防火墙没放行；显示 `ok` 但页面提示「链接失效」，是电脑端的密钥和服务器的 `RELAY_KEY` 不一致，改对后重新扫码。

## 安全说明

- 直接用 `http://` 时，内容和令牌都是明文传输，路上的人能看到。自己临时用问题不大；介意的话加 HTTPS：
  有域名时可以在服务器上用 [Caddy](https://caddyserver.com/) 反向代理（自动申请证书，WebSocket 无需额外配置），`Caddyfile`：

  ```
  relay.example.com {
      reverse_proxy 127.0.0.1:8787
  }
  ```

  然后电脑端地址填 `https://relay.example.com`，安全组放行 80 / 443，8787 可以关掉。注意国内服务器的 80 / 443 端口要求域名已备案

- 二维码链接等同于「只读密码」，不要发到群里或截图外传。泄露后换密钥即可

## 本地试运行

```bash
cd relay && npm install
RELAY_KEY=test-key-0123456789abcdef node server.mjs
```

电脑端地址填 `http://127.0.0.1:8787`，密钥填上面那串。
