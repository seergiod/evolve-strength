import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, UserPlus, Check, Send, Users, Plus, Search, Loader2 } from "lucide-react";

type ProfilePreview = {
  id: string;
  username: string;
  display_name: string | null;
};

type FriendEntry = {
  id: string;
  peer_id: string;
  peer_name: string;
  status: string;
};

type MessageItem = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

export function SocialPanel() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendEntry[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendEntry | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<ProfilePreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSocial();

    const channel = supabase
      .channel(`social-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const newMessage = payload.new as MessageItem;
          if (!selectedFriend) return;
          if (
            newMessage.sender_id === selectedFriend.peer_id ||
            newMessage.receiver_id === selectedFriend.peer_id
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, selectedFriend]);

  // Live search (debounced)
  useEffect(() => {
    if (!user) return;
    const term = searchUsername.trim();
    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,display_name")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .neq("id", user.id)
        .limit(10);
      if (!error) setSearchResults(data || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchUsername, user]);

  const loadSocial = async () => {
    if (!user) return;
    const { data: friendshipData, error } = await supabase
      .from("friendships")
      .select("id,requester_id,receiver_id,status")
      .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      toast.error("No se pudo cargar la lista de amigos");
      return;
    }

    const accepted = (friendshipData || []).filter((rel) => rel.status === "accepted");
    const pending = (friendshipData || []).filter(
      (rel) => rel.status === "pending" && rel.receiver_id === user.id,
    );

    const friendIds = accepted.map((rel) =>
      rel.requester_id === user.id ? rel.receiver_id : rel.requester_id,
    );
    const requesterIds = pending.map((rel) => rel.requester_id);
    const allIds = [...new Set([...friendIds, ...requesterIds])];

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .in("id", allIds.length ? allIds : [user.id]);

    const profileMap = new Map(profileData?.map((profile) => [profile.id, profile]));

    setFriends(
      accepted.map((rel) => {
        const peerId = rel.requester_id === user.id ? rel.receiver_id : rel.requester_id;
        const peer = profileMap.get(peerId);
        return {
          id: rel.id,
          peer_id: peerId,
          peer_name: peer?.display_name || peer?.username || "Amigo",
          status: rel.status,
        };
      }),
    );

    setRequests(
      pending.map((rel) => {
        const peerId = rel.requester_id;
        const peer = profileMap.get(peerId);
        return {
          id: rel.id,
          peer_id: peerId,
          peer_name: peer?.display_name || peer?.username || "Usuario",
          status: rel.status,
        };
      }),
    );

    if (selectedFriend) {
      await loadMessages(selectedFriend.peer_id);
    }
  };

  const loadMessages = async (peerId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id,sender_id,receiver_id,content,created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("No se pudieron cargar los mensajes");
      return;
    }

    setMessages(
      (data || []).filter(
        (item) => item.sender_id === peerId || item.receiver_id === peerId,
      ),
    );
  };

  const sendFriendRequest = async (targetId: string) => {
    if (!user) return;
    if (targetId === user.id) {
      toast.error("No puedes enviarte solicitud a ti mismo");
      return;
    }
    setSendingTo(targetId);
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      receiver_id: targetId,
      status: "pending",
    });
    setSendingTo(null);
    if (error) {
      toast.error("Ya existe una solicitud o no se pudo enviar");
      return;
    }
    toast.success("Solicitud de amistad enviada");
    setSearchUsername("");
    setSearchResults([]);
    loadSocial();
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", requestId);
    if (error) {
      toast.error("No se pudo aceptar la solicitud");
      return;
    }
    toast.success("Solicitud aceptada");
    loadSocial();
  };

  const sendMessage = async () => {
    if (!selectedFriend || !message.trim() || !user) return;
    const { error } = await supabase.from("chat_messages").insert({
      sender_id: user.id,
      receiver_id: selectedFriend.peer_id,
      content: message.trim(),
    });
    if (error) {
      toast.error("No se pudo enviar el mensaje");
      return;
    }
    setMessage("");
    await loadMessages(selectedFriend.peer_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="card-elevated rounded-3xl p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Social Club</p>
          <h3 className="font-display text-xl font-bold">Chat y amigos</h3>
          <p className="text-sm text-muted-foreground">Comunícate en tiempo real con tu círculo de entrenamiento.</p>
        </div>
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" />
          <span className="text-sm font-semibold">{friends.length} amigos</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.4fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/50 bg-background/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Buscar usuarios</p>
              <UserPlus className="h-4 w-4 text-accent" />
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="Escribe un nombre o username..."
                  className="bg-input/60 pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {searchUsername.trim().length >= 2 && (
                <div className="rounded-2xl border border-border/40 bg-background/70 max-h-64 overflow-y-auto divide-y divide-border/30">
                  {searchResults.length === 0 && !searching ? (
                    <p className="text-xs text-muted-foreground p-3">Sin resultados.</p>
                  ) : (
                    searchResults.map((p) => {
                      const alreadyFriend = friends.some((f) => f.peer_id === p.id);
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{p.display_name || p.username}</p>
                            <p className="text-[11px] text-muted-foreground truncate">@{p.username}</p>
                          </div>
                          {alreadyFriend ? (
                            <span className="text-xs text-accent flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Amigos
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => sendFriendRequest(p.id)}
                              disabled={sendingTo === p.id}
                              className="gap-1 bg-gradient-to-r from-primary to-accent"
                            >
                              {sendingTo === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                              Añadir
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/50 bg-background/60 p-4">
            <p className="text-sm font-semibold mb-3">Solicitudes pendientes</p>
            <div className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay solicitudes nuevas.</p>
              ) : (
                requests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-border/40 bg-background/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{request.peer_name}</p>
                      <p className="text-xs text-muted-foreground">Solicitud recibida</p>
                    </div>
                    <Button onClick={() => acceptRequest(request.id)} className="gap-2 bg-accent text-accent-foreground">
                      <Check className="h-4 w-4" /> Aceptar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-background/60 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold">Chat en vivo</p>
              <p className="text-xs text-muted-foreground">Selecciona un amigo para chatear.</p>
            </div>
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.5fr]">
            <div className="space-y-3 rounded-3xl border border-border/40 bg-background/80 p-3">
              {friends.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aún no tienes amigos conectados.</p>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => {
                      setSelectedFriend(friend);
                      void loadMessages(friend.peer_id);
                    }}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                      selectedFriend?.peer_id === friend.peer_id
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/30 bg-background/70 hover:border-primary/40"
                    }`}
                  >
                    <p className="font-semibold">{friend.peer_name}</p>
                    <p className="text-[11px] text-muted-foreground">{friend.status}</p>
                  </button>
                ))
              )}
            </div>
            <div className="flex h-full flex-col gap-3 rounded-3xl border border-border/40 bg-background/80 p-3">
              {selectedFriend ? (
                <>
                  <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div>
                      <p className="font-semibold">{selectedFriend.peer_name}</p>
                      <p className="text-xs text-muted-foreground">Chat privado</p>
                    </div>
                  </div>
                  <div className="min-h-[240px] space-y-3 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Envía el primer mensaje para iniciar la charla.</p>
                    ) : (
                      messages.map((item) => {
                        const fromMe = item.sender_id === user?.id;
                        return (
                          <div key={item.id} className={`rounded-3xl px-4 py-3 ${fromMe ? "bg-primary/20 self-end" : "bg-background/70 self-start"}`}>
                            <p className="text-sm">{item.content}</p>
                            <p className="mt-2 text-[10px] text-muted-foreground text-right">{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="bg-input/60"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <Button onClick={sendMessage} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
                      <Send className="h-4 w-4" /> Enviar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/30 bg-background/70 p-6 text-center">
                  <p className="text-sm font-semibold">Selecciona un amigo</p>
                  <p className="text-xs text-muted-foreground mt-2">Verás aquí la conversación en tiempo real.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
