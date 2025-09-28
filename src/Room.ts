import { WebSocket } from "ws";

// Kullanıcı tipi
export type UserData =
{
  id: string;
  name: string;
  ws: WebSocket;
  score: number;
  elapsedSeconds: number;
  selectedOption: number;
  bot: boolean;
};

export interface Question
{
  question: string;
  options: string[]; // 4 seçenek
  correctIndex: number; // 0-3 arasında doğru cevabın indeksi
}

// Oda class’ı
export class Room
{
  code: string;
  host: UserData;
  users: UserData[] = [];
  questions: Question[] = [];
  currentQuestionIndex: number = 0;

  eliminatedUser: UserData = null;
  eliminatedOtherUsers: UserData[] = [];

  questionStartTime: number = 0;

  finished: boolean = false;

  constructor(code: string, host: UserData, questions: Question[])
  {
    this.code = code;
    this.host = host;
    this.questions = questions;
    //this.users.push(host);
  }

  addUser(user: UserData)
  {
    this.users.push(user);
    this.broadcastUsers();
  }

  removeUser(userId: string)
  {
    this.users = this.users.filter(u => u.id !== userId);
    this.broadcastUsers();
  }

  broadcastUsers()
  {
    const data = JSON.stringify({
      type: "roomUpdateResponse",
      message: "success",
      users: this.users
    });
    this.host.ws.send(data);
    this.users.forEach(u =>
    {
      if (u.ws) u.ws.send(data); // sadece gerçek oyunculara gönder
    });
  }

  startGame()
  {
    this.currentQuestionIndex = 0;
    this.users.forEach(u => u.selectedOption = -1);
    this.broadcastCurrentQuestion();
  }

  submitAnswer(userId: string, optionIndex: number)
  {
    const user = this.users.find(u => u.id === userId);

    if (!user) return;
    user.elapsedSeconds = (Date.now() - this.questionStartTime) / 1000;
    user.selectedOption = optionIndex;

    const data = JSON.stringify(
    {
      type: "hostAnswerResponse",
      owner: userId,
      chosenIndex: optionIndex
    });
    this.host.ws.send(data);
    // Tüm kullanıcılar seçimini yaptıysa
    if (this.users.filter(u => u.score > 0).every(u => u.selectedOption !== -1))
    {
      this.evaluateAnswers();
    }
  }

  evaluateAnswers()
  {
    const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;

    this.users.forEach(u =>
      {
      if (u.score > 0 && u.selectedOption !== correctIndex || u.selectedOption == -1)
      {
        u.score -= 1 + ((u.elapsedSeconds / 10.0) * 0.5);
      }
      else if(u.score > 0 && u.selectedOption == correctIndex)
      {
          u.score -= (u.elapsedSeconds / 10.0)* 0.5
      }

      // Elenme kontrolü
      if (u.score <= 0)
      {
        if (!this.eliminatedUser)
        {
          this.eliminatedUser = u;
        } else if (!this.eliminatedOtherUsers.find(e => e.id === u.id))
        {
          this.eliminatedOtherUsers.push(u);
        }
      }

      u.selectedOption = -1;
    });

    const data = JSON.stringify(
      {
      type: "answerResultsResponse",
      users: this.users.map(u => ({ id: u.id, name: u.name, score: u.score })),
      correctIndex
    });
    this.host.ws.send(data);
    this.users.forEach(u =>
    {
      if (u.ws) u.ws.send(data); // sadece gerçek oyunculara gönder
    });

    // Eğer oyun bittiyse
    if (this.isGameOver())
    {
      setTimeout(() => this.finishGame(), 5000);
    }
    else
    {
      setTimeout(() => this.nextQuestion(), 5000);
    }
  }

  broadcastHostExit()
  {
    const data = JSON.stringify(
      {
      type: "OnHostExitResponse",
      message: "Host has left the room."
    });

    // Oda içindeki tüm user’lara gönder
    this.users.forEach(u =>
      {
      if (u.ws) u.ws.send(data);
    });
}

  isGameOver(): boolean
  {
    // 5 soru bittiyse
    if (this.currentQuestionIndex + 1 >= this.questions.length) return true;

    // Eğer elenmeyen sadece 1 kişi kaldıysa oyun biter
    const alive = this.users.filter(u => u.score > 0);
    if (alive.length <= 1) return true;

    return false;
  }

  finishGame()
  {
    let ranking: UserData[] = [];

    const alive = this.users.filter(u => u.score > 0);

    if (!this.eliminatedUser)
    {
      // hiç kimse elenmemiş
      ranking = [...this.users].sort((a, b) => b.score - a.score).slice(0, 3);
    }
    else if (this.eliminatedUser && this.eliminatedOtherUsers.length === 0)
    {
      // sadece 1 kişi elenmiş
      const top3 = [...this.users].sort((a, b) => b.score - a.score).slice(0, 3);
      ranking = top3;
    }
    else if (this.eliminatedOtherUsers.length === 1)
    {
      // birden fazla elenen var ama 1 kişi extra elenmiş
      // kalan 2 alive oyuncu → 1. ve 2.
      // eliminatedOtherUsers son kişi → 3.
      const aliveSorted = alive.sort((a, b) => b.score - a.score);
      ranking = [
        aliveSorted[0],
        aliveSorted[1],
        this.eliminatedOtherUsers[this.eliminatedOtherUsers.length - 1]
      ];
    }
    else if (this.eliminatedOtherUsers.length == 2)
    {
      // 2 kişi elenmiş → son alive 1. olur, diğer 2 kişi 2. ve 3.
      if (alive.length > 0) ranking.push(alive[0]);
      ranking.push(this.eliminatedOtherUsers[this.eliminatedOtherUsers.length - 2]);
      ranking.push(this.eliminatedOtherUsers[this.eliminatedOtherUsers.length - 1]);
    }

    const data = JSON.stringify(
      {
      type: "gameOverResponse",
      ranking: ranking.map((u, index) => (
        {
        place: index + 1,
        id: u.id,
        name: u.name,
        score: u.score
      }))
    });

    this.host.ws.send(data);
    this.users.forEach(u =>
    {
      if (u.ws) u.ws.send(data); // sadece gerçek oyunculara gönder
    });

    this.finished = true;
  }

  broadcastQuestions()
  {
    const data = JSON.stringify({
      type: "roomQuestions",
      questions: this.questions
    });
    this.host.ws.send(data);
    this.users.forEach(u =>
    {
      if (u.ws) u.ws.send(data); // sadece gerçek oyunculara gönder
    });
  }

  broadcastCurrentQuestion()
  {
    if (this.currentQuestionIndex >= this.questions.length) return;

    this.questionStartTime = Date.now();
    const question = this.questions[this.currentQuestionIndex];
    const data = JSON.stringify({
      type: "nextQuestionResponse",
      questionIndex: this.currentQuestionIndex,
      question: question.question,
      options: question.options
    });

    this.host.ws.send(data);
    this.users.forEach(u =>
    {
      if (u.ws) u.ws.send(data); // sadece gerçek oyunculara gönder
    });

    this.simulateBotAnswers();
  }

  nextQuestion()
  {
    this.currentQuestionIndex++;
    this.broadcastCurrentQuestion();
  }

  simulateBotAnswers()
  {
      const bots = this.users.filter(u => u.bot && u.score > 0);

      bots.forEach(bot =>
      {
      // 1–4 saniye arasında rastgele bekleme
      const delay = Math.floor(Math.random() * 4000) + 1000;
      setTimeout(() =>
      {
        // Bot random şık seçer
        const randomOption = Math.floor(Math.random() * 4);
        this.submitAnswer(bot.id, randomOption);
      }, delay);
    });
  }
}
