import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Room, UserData } from "./Room";
import { EnokiClient } from "@mysten/enoki";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import fetch from "node-fetch";
import { toBase64 } from '@mysten/sui/utils';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const PORT = process.env.PORT ? Number(process.env.PORT) : 1380;
const rooms: Record<string, Room> = {};
const enokiClient = new EnokiClient(
{
  apiKey: "enoki_private_8523b214064862c147d62ae711d7d7c7"
});

const suiQuestions: Question[] = [
  {
    question: "In which language is Sui written?",
    options: ["Solidity", "Move", "Rust", "Python"],
    correctIndex: 1
  },
  {
    question: "Which consensus does Sui use?",
    options: ["PoW", "PoS", "Narwhal", "DPoS"],
    correctIndex: 2
  },
  {
    question: "Which wallet is best for NFTs?",
    options: ["Sui", "Ethereum", "Bitcoin", "Solana"],
    correctIndex: 0
  },
  {
    question: "What does Layer-1 mean?",
    options: ["On another chain", "Own chain", "Testnet only", "Sidechain"],
    correctIndex: 1
  },
  {
    question: "Move language is for which chain?",
    options: ["Sui", "Ethereum", "Solana", "Polkadot"],
    correctIndex: 0
  }
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

      case "enokiSponsorRequest":
       {
          handleEnokiSponsorRequest(ws, msg);
          break;
       }

    }
  });

  ws.on("close", () =>
  {
    handleDisconnect(ws);
  });
});

function handleCreateRoomRequest(ws: WebSocket, ownerId: string)
{
  const user: UserData = { id: ownerId, name: ownerId, score: 5, selectedOption: -1, ws };
  //const roomCode = generateRoomCode();
  const roomCode = "AAA";
  const room = new Room(roomCode, user, suiQuestions);
  rooms[roomCode] = room;

  ws.send(JSON.stringify({
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

async function createSponsoredTx()
{
  // Transaction oluştur
  const tx = new Transaction();
  // Transaction içine örnek bir işlem ekleyelim (mesela coin split)
  //tx.setSender("0x0d9b5ca4ebae5f4a7bd3f17e4e36cd6f868d8f0c5a7f977f94f836631fe0288d");

  // tx.moveCall(
  // {
  //   target: "0x2::coin::split",
  //   arguments: [
  //     tx.object("0xdb95ebb20298cd5d9c8ddf8a8315dc95fa4c53fb46aad73b1e04c64e985f690d"),
  //     tx.pure.u64(1000000n) // 1 SUI’yi bölelim örnek
  //   ],
  //   typeArguments: ["0x2::sui::SUI"]
  // });
  const amount = 100000000
  const recipient = "0x9da882840e535a3971337a353507a0236dda90c7b699149129e1bb131492e520"


  // üretilen coini transfer et
  //tx.transferObjects([coin], tx.pure.address(recipient));
  tx.moveCall({
    target: "0x2::pay::split_and_transfer",
    typeArguments: ["0x2::sui::SUI"],
    arguments: [
      tx.object(
        "0xdb95ebb20298cd5d9c8ddf8a8315dc95fa4c53fb46aad73b1e04c64e985f690d"
      ), // SUI coin object
      tx.pure.u64(1_000_000), // amount in MIST
      tx.pure.address(
        recipient
      ),
    ],
  });

  // onlyTransactionKindBytes çıkar
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
      "0x0d9b5ca4ebae5f4a7bd3f17e4e36cd6f868d8f0c5a7f977f94f836631fe0288d",
    allowedMoveCallTargets: [
      "0x2::pay::split_and_transfer",
    ],
  });

  console.log({
    bytes: sponsored.bytes,
    digest: sponsored.digest,
  });

  // Enoki sponsor çağrısı
  // const sponsorResp = await fetch("https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor",
  // {
  //   method: "POST",
  //   headers:
  //   {
  //     "Authorization": "Bearer enoki_private_8523b214064862c147d62ae711d7d7c7",
  //     "Content-Type": "application/json"
  //   },
  //   body: JSON.stringify(
  //   {
  //     network: "testnet",
  //     sender: "0x0d9b5ca4ebae5f4a7bd3f17e4e36cd6f868d8f0c5a7f977f94f836631fe0288d",
  //     transactionBlockKindBytes: transactionBlockKindBase64,
  //     allowedMoveCallTargets: ['0x2::pay::transfer']
  //   })
  // });

  const sponsorData = await sponsored.json();
  console.log("✅ Sponsor Response:", sponsorData);

  return sponsorData;
}


async function handleEnokiSponsorRequest(ws: WebSocket, msg: any)
{
  await createSponsoredTx();
}


function handleDisconnect(ws: WebSocket)
{
  Object.values(rooms).forEach(room => {
    const user = room.users.find(u => u.ws === ws);
    if (user) {
      room.removeUser(user.id);
      console.log(`❌ User ${user.id} disconnected from room ${room.code}`);
    }
  });
}

server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
