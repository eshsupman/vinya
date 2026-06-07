package main

import "sync"

const maxClientsPerRoom = 2

type Room struct {
	id      string
	clients map[*Client]bool
	mu      sync.RWMutex
}

func newRoom(id string) *Room {
	return &Room{id: id, clients: make(map[*Client]bool)}
}

func (r *Room) add(c *Client) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.clients) >= maxClientsPerRoom {
		return false
	}
	r.clients[c] = true
	c.room = r
	return true
}

func (r *Room) remove(c *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.clients, c)
}

func (r *Room) size() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.clients)
}

func (r *Room) broadcast(sender *Client, msg []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for client := range r.clients {
		if client == sender {
			continue
		}
		select {
		case client.send <- msg:
		default:
		}
	}
}
