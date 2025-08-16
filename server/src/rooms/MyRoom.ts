import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./MyState";
 
export class MyRoom extends Room {
    maxClients = 4;
    state = new MyState();
 
    // Called when the room is created
    onCreate(options) { 
        this.onMessage("move", (client, data) => {
        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        // Simple movement logic: move by 0.1 units per message
        const speed = 0.1;
        if (typeof data.x === "number") {
            player.x += data.x * speed;
        }
        if (typeof data.z === "number") {
            player.z += data.z * speed;
        }
    });

    }
 
    // Called when a client joins the room
    onJoin(client: Client, options: any) {
        const FLOOR_SIZE = 3;
        var player = new Player();
        player.x = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);
        player.y = 1;
        player.z = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);
        this.state.players.set(client.sessionId, player);
    }
 
    // Called when a client leaves the room
    onLeave(client: Client, options: any) {
        this.state.players.delete(client.sessionId);
    }
 
    // Called when the room is disposed
    onDispose() { }
}
