import { Room, Client } from "@colyseus/core";
import { MyState, Player } from "./MyState";

const CHARACTER_MODELS = [
    "character-a.glb", "character-b.glb", "character-c.glb", "character-d.glb",
    "character-e.glb", "character-f.glb", "character-g.glb", "character-h.glb",
    "character-i.glb", "character-j.glb", "character-k.glb", "character-l.glb",
    "character-m.glb", "character-n.glb", "character-o.glb", "character-p.glb",
    "character-q.glb", "character-r.glb"
];

export class MyRoom extends Room {
    maxClients = 4;
    state = new MyState();

    // Called when the room is created
    onCreate(options) { 
        this.onMessage("move", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            // Simple movement logic: move by 0.1 units per message
            const speed = 0.5;
            const speedRot = Math.PI / 16.0; // Rotation speed
            if (typeof data.x === "number") {
                player.x += Math.sin(player.rotY ?? 0) * data.z * speed;
                player.z += Math.cos(player.rotY ?? 0) * data.z * speed;
            }
            // Handle rotation
            if (typeof data.rotY === "number" && data.rotY !== 0) {
                let sign = data.rotY > 0 ? 1 : -1;
                player.rotY = player.rotY + speedRot * sign;
            }
        });
    }

    // Called when a client joins the room
    onJoin(client: Client, options: any) {
        const FLOOR_SIZE = 3;
        const player = new Player();
        player.x = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);
        player.y = 0;
        player.z = -(FLOOR_SIZE / 2) + (Math.random() * FLOOR_SIZE);
        player.rotY = Math.PI; // Initialize rotation

        // Assign a character model based on join order or randomly
        const assignedIndex = this.state.players.size % CHARACTER_MODELS.length;
        player.model = CHARACTER_MODELS[assignedIndex];

        this.state.players.set(client.sessionId, player);
    }

    // Called when a client leaves the room
    onLeave(client: Client, options: any) {
        this.state.players.delete(client.sessionId);
    }

    // Called when the room is disposed
    onDispose() { }
}
