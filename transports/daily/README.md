# Pipecat's Real-Time Voice Inference - Daily Transport

[![Docs](https://img.shields.io/badge/documentation-blue)](https://docs.pipecat.ai/client/introduction)
![NPM Version](https://img.shields.io/npm/v/@pipecat-ai/daily-transport)

Daily transport package for use with `@pipecat-ai/client-js`.

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

###Documentation

Please refer to the RTVI documentation [here](https://docs.pipecat.ai/client/introduction).