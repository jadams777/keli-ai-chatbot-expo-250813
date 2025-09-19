import { Platform } from "react-native";
import structuredClone from "@ungap/structured-clone";
require("@azure/core-asynciterator-polyfill");

if (Platform.OS !== "web") {
  if (typeof global.self === "undefined") {
    global.self = global;
  }
  const { polyfillGlobal } = require(
    "react-native/Libraries/Utilities/PolyfillFunctions"
  );

  const { TextEncoderStream, TextDecoderStream } = require(
    "@stardazed/streams-text-encoding"
  );

  const {
    ReadableStream,
    WritableStream,
    TransformStream,
  } = require("web-streams-polyfill");

  if (!("structuredClone" in global)) {
    polyfillGlobal("structuredClone", () => structuredClone);
  }

  polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
  polyfillGlobal("TextDecoderStream", () => TextDecoderStream);

  if (typeof global.ReadableStream === "undefined") {
    polyfillGlobal("ReadableStream", () => ReadableStream);
  } else if (!global.ReadableStream) {
    global.ReadableStream = ReadableStream;
  }

  if (typeof global.WritableStream === "undefined") {
    polyfillGlobal("WritableStream", () => WritableStream);
  } else if (!global.WritableStream) {
    global.WritableStream = WritableStream;
  }

  if (typeof global.TransformStream === "undefined") {
    polyfillGlobal("TransformStream", () => TransformStream);
  } else if (!global.TransformStream) {
    global.TransformStream = TransformStream;
  }
}

export {};
