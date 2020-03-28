import * as express from "express";
import  * as socketIO from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import * as path from "path";
 
export class Server {

	private httpServer: HTTPServer;
	private app: express.Application;
	private io: socketIO.Server;

	private readonly DEFAULT_PORT = 8080;
	private activeSockets: string[] = [];

	constructor(){
		this.initialize();
		this.handleRoutes();
		this.handleSocketConnection();
		this.configureApp();
   		this.handleSocketConnection();
	}

	private initialize(): void{
		this.app = express();
		this.httpServer = createServer(this.app);
		this.io = socketIO(this.httpServer);
	}

	private handleRoutes(): void {
  		this.app.get("/", (req, res) => {
     		res.send(`<h1>Hello World</h1>`); 
   	});
	}
 
	private handleSocketConnection(): void {
    this.io.on("connection", socket => {
      console.log("Connected : "+socket.id);	
      const existingSocket = this.activeSockets.find(
        existingSocket => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter(
            existingSocket => existingSocket !== socket.id
          )
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id]
        });
      }

      socket.on("call-user", (data: any) => {
            console.log("calling another user socket"+socket.id+" , offer: "+data.offer);
            socket.to(data.to).emit("call-made", {
              offer: data.offer,
              socket: socket.id
            });
          });

          socket.on("make-answer", data => {
            socket.to(data.to).emit("answer-made", {
              socket: socket.id,
              answer: data.answer
            });
          });

          socket.on("reject-call", data => {
            socket.to(data.from).emit("call-rejected", {
              socket: socket.id
            });
          });

          socket.on("disconnect", () => {
        console.log("Disconnected : "+socket.id);
            this.activeSockets = this.activeSockets.filter(
              existingSocket => existingSocket !== socket.id
            );
            socket.broadcast.emit("remove-user", {
              socketId: socket.id
            });
          });
        });
  }


	public listen(callback: (port: number) => void): void {
   		this.httpServer.listen(this.DEFAULT_PORT, () =>
     		callback(this.DEFAULT_PORT));
	}

	private configureApp(): void {
   		this.app.use(express.static(path.join(__dirname, "../public")));
 	}		

}
