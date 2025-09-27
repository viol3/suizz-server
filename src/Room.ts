import { WebSocket } from "ws";

// Kullanıcı tipi
export type UserData =
{
  id: string;
  name: string;
  ws: WebSocket;
  score: number;
  selectedOption: number;
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
    this.users.forEach(u => u.ws.send(data));
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

    user.selectedOption = optionIndex;

    // Tüm kullanıcılar seçimini yaptıysa
    if (this.users.every(u => u.selectedOption !== -1))
    {
      this.evaluateAnswers();
    }
  }

  evaluateAnswers()
  {
    const correctIndex = this.questions[this.currentQuestionIndex].correctIndex;
    this.users.forEach(u =>
    {
      if (u.selectedOption !== correctIndex)
      {
        u.score = u.score - 1; // yanlış cevap -20 puan
      }
      u.selectedOption = -1; // bir sonraki soru için reset
    });

    // Sonuçları broadcast et
    const data = JSON.stringify({
      type: "answerResultsResponse",
      users: this.users.map(u => ({ id: u.id, name: u.name, score: u.score }))
    });
    this.host.ws.send(data);
    this.users.forEach(u => u.ws.send(data));
    setTimeout(() =>
    {
        this.nextQuestion();
    }, 3000);
  }

  broadcastQuestions()
  {
    const data = JSON.stringify({
      type: "roomQuestions",
      questions: this.questions
    });
    this.host.ws.send(data);
    this.users.forEach(u => u.ws.send(data));
  }

  broadcastCurrentQuestion()
  {
    if (this.currentQuestionIndex >= this.questions.length) return;
    console.log("naberr");
    const question = this.questions[this.currentQuestionIndex];
    const data = JSON.stringify({
      type: "nextQuestionResponse",
      questionIndex: this.currentQuestionIndex,
      question: question.question,
      options: question.options
    });

    this.host.ws.send(data);
    this.users.forEach(u => u.ws.send(data));
  }

  nextQuestion()
  {
    this.currentQuestionIndex++;
    this.broadcastCurrentQuestion();
  }
}
