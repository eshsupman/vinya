package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 64 * 1024
	sendBuffer     = 16
)

var allowedOrigins map[string]bool

func configureOrigins() {
	raw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	if raw == "" {
		allowedOrigins = nil
		return
	}
	allowedOrigins = make(map[string]bool)
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowedOrigins[o] = true
		}
	}
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,
	CheckOrigin: func(r *http.Request) bool {
		if allowedOrigins == nil {
			return true // development: accept any origin
		}
		return allowedOrigins[r.Header.Get("Origin")]
	},
}

type Message struct {
	Type    string          `json:"type"`
	RoomID  string          `json:"roomId,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	room *Room
	send chan []byte
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, sendBuffer)}
	go client.writePump()
	go client.readPump()
}

func encode(msg Message) []byte {
	b, _ := json.Marshal(msg)
	return b
}

func (c *Client) readPump() {
	defer func() {
		if room := c.room; room != nil {
			room.broadcast(c, encode(Message{Type: "peer-left"}))
			room.remove(c)
			c.hub.cleanup(room)
		}
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("read error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "join":
			room := c.hub.joinRoom(msg.RoomID, c)
			if room == nil {
				c.trySend(encode(Message{Type: "room-full"}))
				continue
			}
			room.broadcast(c, encode(Message{Type: "peer-joined"}))
		default:
			if c.room != nil {
				c.room.broadcast(c, raw)
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) trySend(msg []byte) {
	select {
	case c.send <- msg:
	default:
	}
}
