import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Room, UserData } from "./Room";
import { EnokiClient } from "@mysten/enoki";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import fetch from "node-fetch";
import { toBase64 } from '@mysten/sui/utils';
import fs from "fs";

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const PORT = process.env.PORT ? Number(process.env.PORT) : 1380;
const rooms: Record<string, Room> = {};
const enokiClient = new EnokiClient(
{
  apiKey: "enoki_private_8523b214064862c147d62ae711d7d7c7"
});

const questions: Question[] = [
  {
    question: "Which language is used to write Sui smart contracts?",
    options: ["Move", "Solidity", "Rust", "Python"],
    correctIndex: 0
  },
  {
    question: "Sui is primarily which type of blockchain?",
    options: ["Sidechain", "Layer-1", "Layer-2", "Rollup"],
    correctIndex: 1
  },
  {
    question: "Which consensus pair does Sui use?",
    options: ["HotStuff", "Tendermint", "Narwhal/Bullshark", "Snowman"],
    correctIndex: 2
  },
  {
    question: "Which wallet is built by the Sui team?",
    options: ["Phantom", "MetaMask", "Keplr", "Sui Wallet"],
    correctIndex: 3
  },
  {
    question: "What is unique about Sui’s data model?",
    options: ["Objects", "Accounts", "UTXO", "Graphs"],
    correctIndex: 0
  },
  {
    question: "How does Sui scale transaction execution?",
    options: ["Sharding", "Parallel", "Batching", "Serial"],
    correctIndex: 1
  },
  {
    question: "What is Sui’s native token symbol?",
    options: ["SU", "MOVE", "SUI", "MSUI"],
    correctIndex: 2
  },
  {
    question: "Mysten Labs founders were mainly from where?",
    options: ["Bankers", "Academics", "Anon devs", "Ex-Meta engineers"],
    correctIndex: 3
  },
  {
    question: "Where was the Move language created?",
    options: ["Meta", "Google", "Ethereum", "Polkadot"],
    correctIndex: 0
  },
  {
    question: "When did Sui mainnet go live?",
    options: ["2021", "2023", "2022", "2024"],
    correctIndex: 1
  },
  {
    question: "Which is the official explorer for Sui?",
    options: ["Etherscan", "Solscan", "Sui Explorer", "BscScan"],
    correctIndex: 2
  },
  {
    question: "What is Sui’s gas fee goal?",
    options: ["Random", "Volatile", "High", "Stable"],
    correctIndex: 3
  },
  {
    question: "Which use case is Sui especially optimized for?",
    options: ["Gaming", "Storage", "Privacy", "IoT"],
    correctIndex: 0
  },
  {
    question: "What enables fast simple transfers on Sui?",
    options: ["Rollups", "Parallel path", "Bridges", "MEV auctions"],
    correctIndex: 1
  },
  {
    question: "What do Sui validators primarily need?",
    options: ["License", "KYC", "Staking", "Lottery"],
    correctIndex: 2
  },
  {
    question: "What does a sponsored transaction mean on Sui?",
    options: ["Free forever", "User pays", "Gas burned", "Third party pays"],
    correctIndex: 3
  },
  {
    question: "How does Sui handle many independent transactions?",
    options: ["Parallelism", "Bigger blocks", "PoW mining", "Epoch resets"],
    correctIndex: 0
  },
  {
    question: "Which model best describes asset handling on Sui?",
    options: ["Account lists", "Object ownership", "UTXO sets", "Merkle tries"],
    correctIndex: 1
  },
  {
    question: "Which network does Move mainly target today?",
    options: ["Bitcoin", "Ethereum", "Sui", "Avalanche"],
    correctIndex: 2
  },
  {
    question: "Which category best summarizes Sui overall?",
    options: ["DEX", "Sidechain", "Rollup", "High-perf L1"],
    correctIndex: 3
  },
  {
    question: "Which chain uses Move language natively?",
    options: ["Sui", "Ethereum", "Solana", "Polygon"],
    correctIndex: 0
  },
  {
    question: "What is the role of Sui validators?",
    options: ["Mint NFTs", "Secure network", "Issue tokens", "Build wallets"],
    correctIndex: 1
  },
  {
    question: "Which company incubated Move?",
    options: ["Google", "Meta", "Binance", "Amazon"],
    correctIndex: 1
  },
  {
    question: "What is the gas token on Sui?",
    options: ["USDC", "SUI", "SOL", "ETH"],
    correctIndex: 1
  },
  {
    question: "What type of execution does Sui support?",
    options: ["Serial", "Parallel", "Linear", "Batch"],
    correctIndex: 1
  },
  {
    question: "Which data unit represents assets on Sui?",
    options: ["Tokens", "Objects", "Blocks", "Hashes"],
    correctIndex: 1
  },
  {
    question: "Which use case is Sui best known for?",
    options: ["Gaming", "Storage", "Privacy", "Bridge"],
    correctIndex: 0
  },
  {
    question: "What ensures Sui’s scalability?",
    options: ["Parallel tx", "Mining", "Sharding", "Bigger blocks"],
    correctIndex: 0
  },
  {
    question: "Which consensus family is Sui part of?",
    options: ["BFT", "PoW", "PoH", "PBFT"],
    correctIndex: 0
  },
  {
    question: "Which team created Sui?",
    options: ["Ethereum", "Mysten Labs", "Solana Labs", "Parity"],
    correctIndex: 1
  },
  {
    question: "When was Move introduced?",
    options: ["2017", "2018", "2019", "2020"],
    correctIndex: 2
  },
  {
    question: "Which stablecoin runs on Sui?",
    options: ["USDC", "DAI", "UST", "FRAX"],
    correctIndex: 0
  },
  {
    question: "What is the goal of Sui gas model?",
    options: ["Stable fees", "High burn", "Variable gas", "Free tx"],
    correctIndex: 0
  },
  {
    question: "What is stored as objects on Sui?",
    options: ["Assets", "Accounts", "Validators", "Epochs"],
    correctIndex: 0
  },
  {
    question: "Which explorer supports Sui?",
    options: ["Etherscan", "BscScan", "Sui Explorer", "Solscan"],
    correctIndex: 2
  },
  {
    question: "Which consensus system is unique to Sui?",
    options: ["HotStuff", "Narwhal", "Tendermint", "Aura"],
    correctIndex: 1
  },
  {
    question: "Which year was Mysten Labs founded?",
    options: ["2019", "2020", "2021", "2022"],
    correctIndex: 2
  },
  {
    question: "What are Sui transactions grouped by?",
    options: ["Users", "Objects", "Blocks", "Keys"],
    correctIndex: 1
  },
  {
    question: "Which consensus ensures safety?",
    options: ["Bullshark", "PoW", "DPoS", "Ouroboros"],
    correctIndex: 0
  },
  {
    question: "What secures Sui’s network?",
    options: ["Gas", "Validators", "Wallets", "Apps"],
    correctIndex: 1
  },
];

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("WebSocket server is running\n");
});

const wss = new WebSocketServer({ server });

// 6 haneli oda kodu
function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws: WebSocket) =>
{

  ws.on("message", (data) =>
  {
    const msg = JSON.parse(data.toString());

    switch (msg.type) {
      case "createRoomRequest":
      {
        handleCreateRoomRequest(ws, msg.owner);
        break;
      }

      case "joinRoomRequest":
      {
        handleJoinRoomRequest(ws, msg.owner, msg.ownerName, msg.code);
        break;
      }

      case "leaveRoomRequest":
      {
        handleLeaveRoomRequest(ws, msg.owner, msg.code);
        break;
      }

      case "startGameRequest":
      {
        handleStartGameRequest(ws, msg.code, msg.owner);
        break;
      }

      case "submitAnswerRequest":
      {
        const room = rooms[msg.code];
        if (!room) return;
        room.submitAnswer(msg.owner, msg.optionIndex);
        break;
      }

      case "manualQuestionEndRequest":
      {
        const room = rooms[msg.code];
        if (!room) return;
        room.evaluateAnswers();
        break;
      }

      case "createBotRoomRequest":
      {
        handleCreateBotRoomRequest(ws, msg.owner);
        break;
      }

      case "hostExitRequest":
      {
        handleHostExitRequest(ws, msg.owner);
        break;
      }

      case "enokiSponsorRequest":
       {
          handleEnokiSponsorRequest(ws, msg);
          break;
       }

       case "sponsoredSignatureRequest":
        {
           handleSponsoredSignatureRequest(ws, msg.signature, msg.digest);
           break;
        }

    }
  });

  ws.on("close", () =>
  {
    handleDisconnect(ws);
  });
});

function handleHostExitRequest(ws: WebSocket, ownerId: string)
{

}

function handleCreateBotRoomRequest(ws: WebSocket, ownerId: string)
{
  const user: UserData = { id: ownerId, name: ownerId, score: 5, elapsedSeconds: 0, selectedOption: -1, ws, bot: false };
  const roomCode = "BOT" + Math.random().toString(36).substring(2, 5).toUpperCase();

  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, 10);

  const room = new Room(roomCode, user, selectedQuestions);
  rooms[roomCode] = room;

  // 4 tane bot ekle
  for (let i = 1; i <= 4; i++)
  {
    const bot: UserData = {
      id: `bot-${roomCode}-${i}`,
      name: `Bot${i}`,
      score: 5,
      elapsedSeconds: 0,
      selectedOption: -1,
      ws: null,
      bot: true
    };
    room.addUser(bot);
  }

  ws.send(JSON.stringify(
  {
    type: "createRoomResponse",
    message: roomCode
  }));

  console.log(`🤖 Bot Room created: ${roomCode} by owner ${ownerId}`);
}

function handleCreateRoomRequest(ws: WebSocket, ownerId: string)
{
  const user: UserData = { id: ownerId, name: ownerId, score: 5, selectedOption: -1, ws };
  const roomCode = generateRoomCode();
  //const roomCode = "AAA";

  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffled.slice(0, 10);

  const room = new Room(roomCode, user, selectedQuestions);
  rooms[roomCode] = room;

  ws.send(JSON.stringify(
  {
    type: "createRoomResponse",
    message: roomCode
  }));

  console.log(`✅ Room created: ${roomCode} by owner ${ownerId}`);
}

function handleJoinRoomRequest(ws: WebSocket, ownerId: string, ownerName: string, roomCode: string) {
  const room = rooms[roomCode];

  if (!room) {
    ws.send(JSON.stringify({
      type: "error",
      message: `Room ${roomCode} not found`
    }));
    return;
  }

  const user: UserData = { id: ownerId, name: ownerName, score: 5, selectedOption: -1, ws };
  room.addUser(user);

  // Odaya katılan client’a, odadaki tüm kullanıcıların bilgilerini gönder
  const usersData = room.users.map(u => ({ id: u.id, name: u.name }));

  ws.send(JSON.stringify({
    type: "joinRoomResponse",
    message: "success",
    users: usersData
  }));

  console.log(`✅ User ${ownerId} joined room ${roomCode}`);
}

function handleLeaveRoomRequest(ws: WebSocket, ownerId: string, roomCode: string)
{
  const room = rooms[roomCode];
  if (!room) return;

  room.removeUser(ownerId);
  console.log(`⏹️ User ${ownerId} left room ${roomCode}`);

  // Odadaki kalan kullanıcıları bilgilendir
}

function handleStartGameRequest(ws: WebSocket, roomCode: string, ownerId: string)
{
  const room = rooms[roomCode];
  if (!room)
  {
    ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    return;
  }

  // Sadece host başlatabilir
  if (room.host.id !== ownerId)
  {
    ws.send(JSON.stringify({ type: "error", message: "Only host can start the game" }));
    return;
  }

  // Host ve odadaki kullanıcı sayısı >= 4 ise başlat
  if (room.users.length >= 4)
  {
    room.startGame();
    console.log(`🎮 Game started in room ${roomCode}`);
  }
  else
  {
    ws.send(JSON.stringify({ type: "error", message: "At least 4 players required to start" }));
  }
}

async function createSponsoredTx(ws: WebSocket)
{

  const tx = new Transaction();

  const [paymentCoin] = tx.splitCoins(tx.object("0x4c06f3e8e47346481ea317fa496ad0718650f8dd6f6cb15a7c9dca3684cf07a5"), [100000000]);

  tx.moveCall({
    target: "0x852951c2a65a0d5e44e54d7a3e93a044ec44d1d26e26287f691a78f939e8ead7::suizz::initPool",
    typeArguments: [],
    arguments: [
      paymentCoin
    ],
  });

  const transactionBlockKindBytes = await tx.build(
    {
    client,
    onlyTransactionKind: true
  });
  console.log(transactionBlockKindBytes)
  const transactionBlockKindBase64 = toBase64(transactionBlockKindBytes);
  console.log("gg1");
  console.log(client)
  const sponsored = await enokiClient.createSponsoredTransaction({
    network: "testnet",
    transactionKindBytes: transactionBlockKindBase64,
    sender:
      "0x85a23dbe200595b4c5b6ca44919aaa5b67e9749a02a59bcc7ee6555ab39eab5a",
    allowedMoveCallTargets: [
      "0x852951c2a65a0d5e44e54d7a3e93a044ec44d1d26e26287f691a78f939e8ead7::suizz::initPool",
    ],
  });

  console.log({
    bytes: sponsored.bytes,
    digest: sponsored.digest,
  });

  ws.send(JSON.stringify(
  {
    type: "sponsoredTxResponse",
    bytes: sponsored.bytes,
    digest: sponsored.digest
  }));

}


async function handleEnokiSponsorRequest(ws: WebSocket, msg: any)
{
  await createSponsoredTx(ws);
}

async function handleSponsoredSignatureRequest(ws: WebSocket, signature: string, digest: string)
{
  console.log("digest => " + digest);
  console.log("signature => " + signature);
  const result = await enokiClient.executeSponsoredTransaction(
  {
    digest,
    signature,
  });
}

function handleDisconnect(ws: WebSocket)
{
  Object.values(rooms).forEach(room =>
  {
    if (room.host.ws === ws)
    {
      room.broadcastHostExit();
      delete rooms[room.code];
      console.log(`❌ Host ${room.host.id} disconnected, room ${code} closed`);
      return;
    }
    const user = room.users.find(u => u.ws === ws);
    if (user)
    {
      room.removeUser(user.id);
      console.log(`❌ User ${user.id} disconnected from room ${room.code}`);
    }
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

setInterval(() =>
{
  for (const [code, room] of Object.entries(rooms))
  {
    if (room.finished)
    {
      delete rooms[code];
      console.log(`🗑️ Room ${code} removed (finished).`);
    }
  }
}, 1000); // her 1 saniyede kontrol et
