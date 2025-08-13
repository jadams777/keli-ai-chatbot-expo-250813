# Expo AI Chatbot

A mobile chat interface built with Expo and React Native.

## Prerequisites

- Node.js
- npm, yarn, or bun
- Expo CLI (`npm install -g expo-cli`)

## Setup & Installation

1. Install dependencies:

```
npm install
# or
yarn install
# or
bun install
```

2. Start the Next.js API server:

```
cd ../nextjs-ai-chatbot
npm run dev
```

3. Start Expo development server:

```
bun start
# or
npm start
# or
yarn start
```

4. Run on device/simulator:

- Scan QR code with Expo Go app (iOS/Android)
- Press 'i' for iOS simulator
- Press 'a' for Android emulator

## Development

The app requires both the Expo frontend and Next.js backend to be running:

- Expo frontend runs on default Expo port (8081)
- Next.js API runs on http://localhost:3000

## Project Structure

- `/components` - React Native components
- `/screens` - App screens/pages
- `/design-system` - Design system components based on Tailwind CSS
- `/services/auth` - Authentication service

## API

### `useChatFromHistory`

This hook is used to fetch the chat history from the server. It is used in the `index.tsx` file and also on the `DrawerContent` component. It is used to fetch the chat history from the server and return the messages in a format that can be used by the `Chat` component when the user clicks on the chat history button. Also it's used when a new chat is created.

### ChatInput

This component is used to input the chat messages. It is used in the `index.tsx` file.

ℹ️ There is a `ChatInputAnimated` component that is a alpha version of the `ChatInput` component. It is used to input the chat messages too but it replicates the OpenAI chat interface interaction on new messages where the last message is placed on the top of the vissible chat body screen.

### ChatInterface

This component is used to display the chat messages. It is used in the `index.tsx` file. It also handles Tool Invocations.

### CustomMarkdown

It has custom Nativewind components and custom rules to better display markdown content in the React Native chat context. It is using the `react-native-markdown-display` library and the `@expo/html-elements` library on top. Per the docs: "It a 100% compatible CommonMark renderer, a react-native markdown renderer done right. This is not a web-view markdown renderer but a renderer that uses native components for all its elements.". It has plugins and extensions too to further enhance the markdown rendering to your needs.
