// Import Types for Gemini Transport
import {
  GeminiLiveWebsocketTransport,
  GeminiLLMServiceOptions,
} from "@pipecat-ai/gemini-live-websocket-transport";

import {
  OpenAIRealTimeWebRTCTransport,
  OpenAIServiceOptions,
} from "@pipecat-ai/openai-realtime-webrtc-transport";

// Import core Pipecat RTVI Client and types
import {
  LLMHelper,
  FunctionCallParams,
  Transport,
  RTVIClient,
  RTVIEvent,
  RTVIMessage,
  Participant,
  TranscriptData,
  BotTTSTextData,
  RTVIClientOptions,
} from "@pipecat-ai/client-js";

// Global variables for DOM elements and client state
let statusDiv: HTMLElement;
let audioDiv: HTMLDivElement;
let toggleBotButton: HTMLButtonElement;
let submitBtn: HTMLButtonElement;
let rtviClient: RTVIClient;
let llmHelper: LLMHelper;
let botRunning = false;

// Initialize the application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  statusDiv = document.getElementById("status")!;
  toggleBotButton = document.getElementById("toggleBot")! as HTMLButtonElement;
  toggleBotButton.addEventListener("click", () => toggleBot());

  // Handle microphone device selection
  document.getElementById("mic-picker")!.onchange = (e) => {
    const target = e.target as HTMLSelectElement;
    console.log("user changed device", target, target.value);
    rtviClient.updateMic(target.value);
  };

  // Set up mute button functionality
  const muteBtn = document.getElementById("toggleMute")!;
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = rtviClient.isMicEnabled ? "Unmute Mic" : "Mute Mic";
    rtviClient.enableMic(!rtviClient.isMicEnabled);
  });

  // Set up text submission button
  submitBtn = document.getElementById("submit-text")! as HTMLButtonElement;
  submitBtn.addEventListener("click", () => {
    sendUserMessage();
  });
  submitBtn.disabled = true;

  // Initialize the bot
  initBot();
});

// Connect / Disconnect from bot
async function toggleBot() {
  toggleBotButton.disabled = true;
  if (botRunning) {
    console.log("disconnecting bot");
    await disconnectBot();
  } else {
    console.log("connecting bot");
    await connectBot();
  }
  toggleBotButton.textContent = botRunning ? "Disconnect" : "Connect";
}

// Initialize the bot with configuration
async function initBot() {
  const urlParams = new URLSearchParams(window.location.search);
  const service = urlParams.get("service") || "gemini";
  const { transport, service_options } =
    service === "gemini" ? initGeminiTransport() : initOpenAITransport();

  // Configure RTVI client options
  let RTVIConfig: RTVIClientOptions = {
    transport,
    params: {
      baseUrl: "api",
      requestData: { service_options },
    },
    enableMic: true,
    enableCam: false,
    timeout: 30 * 1000,
  };
  RTVIConfig.customConnectHandler = () => Promise.resolve();

  // Create new RTVI client instance
  rtviClient = new RTVIClient(RTVIConfig);
  llmHelper = new LLMHelper({});
  llmHelper.handleFunctionCall(async (fn: FunctionCallParams) => {
    return await handleFunctionCall(fn.functionName, fn.arguments);
  });
  rtviClient.registerHelper(service, llmHelper);

  // Make RTVI client and transport available globally for debugging
  (window as any).client = rtviClient;

  // Set up RTVI event handlers and initialize devices
  setupEventHandlers(rtviClient);
  await setupDevices();
}

// Initialize the Gemini LLM and its service options
function initGeminiTransport() {
  // Configure Gemini LLM service options
  const llm_service_options: GeminiLLMServiceOptions = {
    api_key: import.meta.env.VITE_DANGEROUS_GEMINI_API_KEY,
    model: "models/gemini-2.0-flash-exp",
    initial_messages: [
      // Set up initial system and user messages.
      // Without the user message, the bot will not respond immediately
      // and wait for the user to speak first.
      {
        role: "model",
        content: "You are a pencil salesman...",
      },
      { role: "user", content: "Hello!" },
    ],
    settings: {
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            // Options are: "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede"
            voice_name: "Charon",
          },
        },
      },
    },
  };

  // Initialize transport
  let transport: Transport = new GeminiLiveWebsocketTransport(
    llm_service_options
  );

  return { transport, service_options: llm_service_options };
}

function initOpenAITransport() {
  // Configure OpenAI LLM service options
  const llm_service_options: OpenAIServiceOptions = {
    api_key: import.meta.env.VITE_DANGEROUS_OPENAI_API_KEY,
    settings: {
      instructions: "You are a pirate. You are looking for buried treasure.",
      voice: "echo",
      input_audio_noise_reduction: { type: "near_field" },
      turn_detection: { type: "semantic_vad" },
      tools: [
        {
          type: "function",
          name: "changeBackgroundColor",
          description: "Change the background color of the page",
          parameters: {
            type: "object",
            properties: {
              color: {
                type: "string",
                description: "A hex value of the color",
              },
            },
          },
        },
        {
          type: "function",
          name: "getWeather",
          description: "Gets the current weather for a given location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "A city or location",
              },
            },
          },
        },
      ],
    },
    initial_messages: [{ role: "user", content: "Hello" }],
  };

  // Initialize transport
  let transport: Transport = new OpenAIRealTimeWebRTCTransport(
    llm_service_options
  );

  return { transport, service_options: llm_service_options };
}

// Initialize and update available audio devices
async function setupDevices() {
  await rtviClient.initDevices();
  const mics = await rtviClient.getAllMics();
  updateMicList(mics);
}

// Updates the microphone selection dropdown
function updateMicList(mics: MediaDeviceInfo[]) {
  const micPicker = document.getElementById("mic-picker")!;
  micPicker.replaceChildren();
  const curMic = rtviClient.selectedMic?.deviceId;
  mics.forEach((mic) => {
    let el = document.createElement("option");
    el.textContent = mic.label;
    el.value = mic.deviceId;
    micPicker.appendChild(el);
    if (mic.deviceId === curMic) {
      el.selected = true;
    }
  });
}

// Connect client to Gemini Multimodal Live bot
async function connectBot() {
  statusDiv.textContent = "Joining...";
  try {
    await rtviClient.connect();
    console.log("READY! Let's GO!");
  } catch (e) {
    console.error("Error connecting", e);
    toggleBotButton.disabled = false;
    return;
  }
  toggleBotButton.disabled = false;
  submitBtn.disabled = false;
  botRunning = true;
}

// Disconnect client from Gemini Multimodal Live bot
async function disconnectBot() {
  try {
    await rtviClient.disconnect();
  } catch (e) {
    console.error("Error disconnecting", e);
  }
  toggleBotButton.disabled = false;
  submitBtn.disabled = true;
  botRunning = false;
}

// Set up event handlers for RTVI client
// https://docs.pipecat.ai/client/js/api-reference/callbacks#2-event-listeners
export async function setupEventHandlers(rtviClient: RTVIClient) {
  audioDiv = document.getElementById("audio") as HTMLDivElement;

  rtviClient.on(RTVIEvent.TransportStateChanged, (state: string) => {
    console.log(`-- transport state change: ${state} --`);
    statusDiv.textContent = `Transport state: ${state}`;
    if (state === "disconnected") {
      botRunning = false;
      toggleBotButton.textContent = "Connect";
    }
  });

  rtviClient.on(RTVIEvent.Connected, () => {
    console.log("-- user connected --");
  });

  rtviClient.on(RTVIEvent.Disconnected, () => {
    console.log("-- user disconnected --");
  });

  rtviClient.on(RTVIEvent.BotConnected, () => {
    console.log("-- bot connected --");
  });

  rtviClient.on(RTVIEvent.BotDisconnected, () => {
    console.log("--bot disconnected --");
  });

  rtviClient.on(RTVIEvent.BotReady, () => {
    console.log("-- bot ready to chat! --");
  });

  // For realtime v2v transports, this event will only fire for the
  // local participant.
  rtviClient.on(
    RTVIEvent.TrackStarted,
    (track: MediaStreamTrack, participant?: Participant) => {
      console.log(" --> track started", participant, track);
      if (participant?.local) {
        return;
      }
      let audio = document.createElement("audio");
      audio.srcObject = new MediaStream([track]);
      audio.autoplay = true;
      audioDiv.appendChild(audio);
    }
  );

  // For realtime v2v transports, this event will only fire for the
  // local participant.
  rtviClient.on(
    RTVIEvent.TrackStopped,
    (track: MediaStreamTrack, participant?: Participant) => {
      console.log(" --> track stopped", participant, track);
    }
  );

  rtviClient.on(RTVIEvent.UserStartedSpeaking, () => {
    console.log("-- user started speaking -- ");
  });

  rtviClient.on(RTVIEvent.UserStoppedSpeaking, () => {
    console.log("-- user stopped speaking -- ");
  });

  rtviClient.on(RTVIEvent.BotStartedSpeaking, () => {
    console.log("-- bot started speaking -- ");
  });

  rtviClient.on(RTVIEvent.BotStoppedSpeaking, () => {
    console.log("-- bot stopped speaking -- ");
  });

  // multimodal live does not currently provide transcripts so this will not fire
  rtviClient.on(RTVIEvent.UserTranscript, (transcript: TranscriptData) => {
    console.log("[EVENT] UserTranscript", transcript);
  });

  // multimodal live does not currently provide transcripts so this will not fire
  rtviClient.on(RTVIEvent.BotTtsText, (data: BotTTSTextData) => {
    console.log("[EVENT] BotTtsText", data);
  });

  // multimodal live does not currently provide transcripts so this will not fire
  rtviClient.on(RTVIEvent.BotTranscript, (data: BotTTSTextData) => {
    console.log("[EVENT] BotTranscript", data);
  });

  rtviClient.on(RTVIEvent.Error, (message: RTVIMessage) => {
    console.log("[EVENT] RTVI Error!", message);
  });

  rtviClient.on(RTVIEvent.MessageError, (message: RTVIMessage) => {
    console.log("[EVENT] RTVI ErrorMessage error!", message);
  });

  // multimodal live does not currently provide metrics so this will not fire
  rtviClient.on(RTVIEvent.Metrics, (data) => {
    // let's only print out ttfb for now
    if (!data.ttfb) {
      return;
    }
    data.ttfb.map((metric) => {
      console.log(`[METRICS] ${metric.processor} ttfb: ${metric.value}`);
    });
  });

  rtviClient.on(RTVIEvent.MicUpdated, (mic: MediaDeviceInfo) => {
    const micPicker = document.getElementById("mic-picker")!;
    for (let i = 0; i < micPicker.children.length; i++) {
      let el = micPicker.children[i] as HTMLOptionElement;
      el.selected = el.value === mic.deviceId;
    }
  });

  rtviClient.on(RTVIEvent.AvailableMicsUpdated, (mics: MediaDeviceInfo[]) => {
    updateMicList(mics);
  });

  rtviClient.on(RTVIEvent.LocalAudioLevel, (level: number) => {
    updateSpeakerBubble(level, "user");
  });
  rtviClient.on(RTVIEvent.RemoteAudioLevel, (level: number) => {
    updateSpeakerBubble(level, "bot");
  });
}

// Send user message to bot.
function sendUserMessage() {
  const textInput = document.getElementById("text-input")! as HTMLInputElement;
  llmHelper.appendToMessages({ role: "user", content: textInput.value }, true);
  textInput.value = "";
}

// Update the speaker bubble size based on the audio level
function updateSpeakerBubble(level: number, whom: string) {
  const volume = level * 100;
  const userBubble = document.getElementById(
    whom === "user" ? "user-bubble" : "bot-bubble"
  )!;
  // Scale the bubble size based on the volume value
  const scale = 1 + volume / 50; // Adjust the divisor to control the scaling effect
  userBubble.style.transform = `scale(${scale})`;
}

async function handleFunctionCall(functionName: string, args: unknown) {
  console.log("[EVENT] LLMFunctionCall", functionName);
  const toolFunctions: { [key: string]: any } = {
    changeBackgroundColor: ({ color }: { [key: string]: string }) => {
      console.log("changing background color to", color);
      document.body.style.backgroundColor = color;
      return { success: true, color };
    },
    getWeather: async ({ location }: { [key: string]: string }) => {
      console.log("getting weather for", location);
      const locationReq = await fetch(
        `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=52c6049352e0ca9c979c3c49069b414d`
      );
      const locJson = await locationReq.json();
      const loc = { lat: locJson[0].lat, lon: locJson[0].lon };
      const exclude = ["minutely", "hourly", "daily"].join(",");
      const weatherRec = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${loc.lat}&lon=${loc.lon}&exclude=${exclude}&appid=52c6049352e0ca9c979c3c49069b414d`
      );
      const weather = await weatherRec.json();
      return { success: true, weather: weather.current };
    },
  };
  const toolFunction = toolFunctions[functionName];
  if (toolFunction) {
    let result = await toolFunction(args);
    console.debug("returning result", result);
    return result;
  }
}
