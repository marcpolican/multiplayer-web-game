import { Client, Room } from 'colyseus.js';

export const serverUrl = "ws://192.168.8.147:2567";
export const colyseusClient = new Client(serverUrl);

export let room: Room | null = null;
export let mySessionId: string | null = null;

export async function joinRoom(onStateChange: (state: any) => void) {
    room = await colyseusClient.joinOrCreate("my_room");
    mySessionId = room.sessionId;
    room.onStateChange(onStateChange);
    // Optionally expose room globally for debugging
    (window as any).colyseusRoom = room;
}