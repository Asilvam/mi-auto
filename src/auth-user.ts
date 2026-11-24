export type AuthUser = { id: string; email: string; name: string; pictureUrl: string }

export type AuthUserPayload = Partial<AuthUser> & { _id?: string }

export function normalizeAuthUser(user: AuthUserPayload): AuthUser {
  const id = user.id ?? user._id
  if (!id) throw new Error('La sesión no contiene un identificador de usuario.')

  return {
    id,
    email: user.email ?? '',
    name: user.name ?? '',
    pictureUrl: user.pictureUrl ?? '',
  }
}
