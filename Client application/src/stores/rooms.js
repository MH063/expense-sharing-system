import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useRoomStore = defineStore('rooms', () => {
  const rooms = ref([])
  const activeRoomId = ref(null)
  const invitations = ref([])
  const loading = ref(false)
  const error = ref(null)

  const activeRoom = computed(() => rooms.value.find(room => room.id === activeRoomId.value) || null)
  const memberCount = computed(() => activeRoom.value?.members?.length || 0)
  const roomMembers = computed(() => activeRoom.value?.members || [])

  const setRooms = (roomList) => {
    rooms.value = Array.isArray(roomList) ? roomList : []
    if (!rooms.value.some(room => room.id === activeRoomId.value)) {
      activeRoomId.value = rooms.value[0]?.id || null
    }
  }

  const setActiveRoomId = (roomId) => {
    activeRoomId.value = roomId
  }

  const upsertRoom = (room) => {
    const index = rooms.value.findIndex(item => item.id === room.id)
    if (index >= 0) {
      rooms.value.splice(index, 1, { ...rooms.value[index], ...room })
    } else {
      rooms.value.push(room)
    }
  }

  const removeRoom = (roomId) => {
    rooms.value = rooms.value.filter(room => room.id !== roomId)
    if (activeRoomId.value === roomId) {
      activeRoomId.value = rooms.value[0]?.id || null
    }
  }

  const setInvitations = (invitationList) => {
    invitations.value = Array.isArray(invitationList) ? invitationList : []
  }

  const addInvitation = (invitation) => {
    invitations.value.push(invitation)
  }

  const removeInvitation = (invitationId) => {
    invitations.value = invitations.value.filter(item => item.id !== invitationId)
  }

  return {
    rooms,
    activeRoomId,
    activeRoom,
    invitations,
    loading,
    error,
    memberCount,
    roomMembers,
    setRooms,
    setActiveRoomId,
    upsertRoom,
    removeRoom,
    setInvitations,
    addInvitation,
    removeInvitation
  }
})
