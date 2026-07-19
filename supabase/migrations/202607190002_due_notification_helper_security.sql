-- A função auxiliar só pode ser alcançada pelos wrappers públicos controlados.

revoke all on function private.refresh_due_notifications_for(uuid, uuid)
  from public, anon, authenticated;
