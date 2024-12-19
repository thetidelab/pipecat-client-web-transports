# OpenAI RealTime WebRTC Transport

[![Docs](https://img.shields.io/badge/Documentation-blue)](https://docs.pipecat.ai/client/reference/js/transports/openai-webrtc)
[![Demo](https://img.shields.io/badge/Demo-forestgreen)](examples/directToLLMTransports/README.md)
![NPM Version](https://img.shields.io/npm/v/@pipecat-ai/openai-realtime-webrtc-transport)

A real-time websocket transport implementation for interacting with Google's Gemini Multimodal Live API, supporting bidirectional audio and unidirectional text communication.

## Installation

```bash copy
npm install \
@pipecat-ai/client-js \
@pipecat-ai/openai-realtime-webrtc-transport
```

## Overview

The `OpenAIRealTimeWebRTCTransport` is a fully functional [RTVI `Transport`](https://docs.pipecat.ai/client/reference/js/transports/transport). It provides a framework for implementing real-time communication directly with the [OpenAI Realtime API using WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc) voice-to-voice service. It handles media device management, audio/video streams, and state management for the connection.

## Features

- Real-time bidirectional communication with OpenAI Realtime API
- Input device management
- Audio streaming support
- Text message support
- Automatic reconnection handling
- Configurable generation parameters
- Support for initial conversation context

## Usage

### Basic Setup

```javascript
import { OpenAIRealTimeWebRTCTransport, OpenAIServiceOptions } from '@pipecat-ai/openai-realtime-webrtc-transport';

const options: OpenAIServiceOptions = {
  api_key: 'YOUR_API_KEY',
  session_config: {
    instructions: 'you are a confused jellyfish',
  }
};

const transport = new OpenAIRealTimeWebRTCTransport(options);
let RTVIConfig: RTVIClientOptions = {
  transport,
  ...
};

```

### Configuration Options

```typescript
interface OpenAIServiceOptions {
  api_key: string;                    // Required: Your Gemini API key
  initial_messages?: Array<{          // Optional: Initial conversation context
    content: string;
    role: string;
  }>;
  session_config?: {
    modailities?: string;
    instructions?: string;
    voice?:
      | "alloy"
      | "ash"
      | "ballad"
      | "coral"
      | "echo"
      | "sage"
      | "shimmer"
      | "verse";
    input_audio_transcription?: {
      model: "whisper-1";
    };
    temperature?: number;
    max_tokens?: number | "inf";
  };
}
```

### Sending Messages

```javascript
// at setup time...
llmHelper = new LLMHelper({});
rtviClient.registerHelper("llm", llmHelper);
// the 'llm' name in this call above isn't used.
//that value is specific to working with a pipecat pipeline

// at time of sending message...
// Send text prompt message
llmHelper.appendToMessages({ role: "user", content: 'Hello OpenAI!' });
```

### Handling Events

The transport implements the various [RTVI event handlers](https://docs.pipecat.ai/client/reference/js/callbacks). Check out the docs or samples for more info.

## API Reference

### Methods

- `initialize()`: Set up the transport and establish connection
- `sendMessage(message)`: Send a text message
- `handleUserAudioStream(data)`: Stream audio data to the model
- `disconnectLLM()`: Close the connection
- `sendReadyMessage()`: Signal ready state

### States

The transport can be in one of the following states:
- "disconnected"
- "initializing"
- "initialized"
- "connecting"
- "connected"
- "ready"
- "disconnecting
- "error"

## Error Handling

The transport includes comprehensive error handling for:
- Connection failures
- WebRTC connection errors
- API key validation
- Message transmission errors

## License
BSD-2 Clause
