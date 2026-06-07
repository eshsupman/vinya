package main

import (
	"log"
	"sync"
)

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{rooms: make(map[string]*Room)}
}

func (h *Hub) joinRoom(id string, c *Client) *Room {
	if id == "" {
		return nil
	}

	h.mu.Lock()
	room, ok := h.rooms[id]
	if !ok {
		room = newRoom(id)
		h.rooms[id] = room
	}
	h.mu.Unlock()

	if !room.add(c) {
		return nil
	}
	log.Printf("client joined room %q (size=%d)", id, room.size())
	return room
}

func (h *Hub) cleanup(room *Room) {
	if room == nil {
		return
	}
	if room.size() == 0 {
		h.mu.Lock()
		delete(h.rooms, room.id)
		h.mu.Unlock()
		log.Printf("room %q removed", room.id)
	}
}
