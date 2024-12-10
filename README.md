# Pipecat Client Web Transports

A mono-repo to house the various supported Transport options to be used with the pipecat-client-web library. Currently, there is a single transport: daily-transport.

## How to use

#### Install relevant packages

```bash
npm install @pipecat-ai/client-js @pipecat-ai/daily-transport
```

#### Import and pass transport to your RTVI client
```typescript
import { RTVIClient } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";

const rtviClient = new RTVIClient({
    transport: new DailyTransport(),
    // ... your RTVI config here
});

await rtviClient.connect();
```

## Documentation

Please refer to the RTVI documentation [here](https://docs.pipecat.ai/client/introduction).

## Local Development

### Build the transport libraries

```bash
$ yarn
$ yarn workspace @pipecat-ai/daily-transport build
```