import { workerData, parentPort } from "worker_threads";
import * as net from "net";
import * as tls from "tls";
import { Agent, interceptors, request as undiciRequest } from "undici";

async function run() {
  const address: string = workerData.address;
  const tlsCa: string[] = workerData.tlsCa;
  const requestHeaders: Record<string, string> = workerData.requestHeaders;

  try {
    const tStart = process.hrtime.bigint();
    let tDns = 0n;
    let tTcp = 0n;
    let tTls = 0n;

    const baseAgent = new Agent({
      connect: (options: any, callback: any) => {
        const host: string = options.hostname ?? options.host;
        const port: number = options.port ? parseInt(options.port, 10) : (options.protocol === "https:" ? 443 : 80);
        const isHttpsConn: boolean = options.protocol === "https:";

        tDns = 0n;
        tTcp = 0n;
        tTls = 0n;

        let socket: tls.TLSSocket | net.Socket;

        if (isHttpsConn) {
          socket = tls.connect({
            host: host,
            port: port,
            servername: options.servername ?? host,
            ca: tlsCa,
            rejectUnauthorized: false
          });

          socket.on("connect", () => {
            tTcp = process.hrtime.bigint();
          });

          (socket as tls.TLSSocket).on("secureConnect", () => {
            tTls = process.hrtime.bigint();
            callback(null, socket);
          });
        } else {
          socket = net.createConnection({
            host: host,
            port: port
          });

          socket.on("connect", () => {
            tTcp = process.hrtime.bigint();
            callback(null, socket);
          });
        }

        socket.on("lookup", () => {
          tDns = process.hrtime.bigint();
        });

        socket.on("error", (err: Error) => {
          callback(err, null);
        });
      },
      headersTimeout: 10000,
      bodyTimeout: 10000
    });

    const dispatcher = baseAgent.compose(interceptors.redirect({
      maxRedirections: 1
    }));

    try {
      const response = await undiciRequest(address, {
        dispatcher: dispatcher,
        method: "HEAD",
        headers: requestHeaders
      });

      const tHeaders = process.hrtime.bigint();

      for await (const _chunk of response.body) {}

      const tEnd = process.hrtime.bigint();

      const toMs = (from: bigint, to: bigint) =>
        parseFloat((Number(to - from) / 1000000).toFixed(2));

      const parsedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) {
          parsedHeaders[key] = Array.isArray(value) ? value.join(", ") : value;
        }
      }

      parentPort!.postMessage({
        statusCode: response.statusCode.toString(),
        dnsMs: tDns > 0n ? toMs(tStart, tDns) : null,
        tcpMs: tDns > 0n && tTcp > 0n ? toMs(tDns, tTcp) : null,
        tlsMs: tTcp > 0n && tTls > 0n ? toMs(tTcp, tTls) : null,
        ttfbMs: tTcp > 0n ? toMs(tTls > 0n ? tTls : tTcp, tHeaders) : null,
        totalMs: toMs(tStart, tEnd),
        responseHeaders: Object.keys(parsedHeaders).length > 0 ? parsedHeaders : null
      });
    } finally {
      await baseAgent.destroy();
    }
  } catch (error: any) {
    parentPort!.postMessage({
      error: true,
      code: error.code ?? ""
    });
  }
}

run();
