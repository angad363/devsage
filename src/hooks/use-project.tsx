import { api } from '@/trpc/react'
import React, { useState, useEffect } from 'react'

const useProject = () => {
  const {data: projects} = api.project.getProjects.useQuery()
  const [projectId, setProjectId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem('projectId') // Retrieve the stored projectId
    }
    return null
  })

  // Save to localStorage whenever projectId changes
  useEffect(() => {
    if (projectId) {
      localStorage.setItem('projectId', projectId)
    }
  }, [projectId])

  const project = projects?.find(project => project.id === projectId)
  return {
    projects,
    project,
    projectId,
    setProjectId
  }
}

export default useProject