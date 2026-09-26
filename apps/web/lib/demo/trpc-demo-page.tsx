'use client'

import { useState } from 'react'

import { api } from '#lib/trpc/react'

export default function HomePage() {
  const [title, setTitle] = useState('')
  const utils = api.useUtils()

  const health = api.health.useQuery()
  const posts = api.posts.list.useQuery()
  const createPost = api.posts.create.useMutation({
    onSuccess: () => {
      setTitle('')
      utils.posts.list.invalidate()
    },
  })

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 16, fontFamily: 'sans-serif' }}>
      <h1>ReadTraining</h1>
      <p>API: {health.data?.status ?? 'loading...'}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          createPost.mutate({ title })
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
        <button type="submit" disabled={createPost.isPending}>Add</button>
      </form>

      <ul>
        {posts.data?.map((post) => (
          <li key={post.id}>
            {post.title} — {post.createdAt.toLocaleString()}
          </li>
        ))}
      </ul>
    </main>
  )
}
