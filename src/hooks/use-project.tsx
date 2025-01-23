
import { api } from '@/trpc/react'
import React, { useState, useEffect } from 'react'
import {useLocalStorage} from 'usehooks-ts'

const useProject = () => {
  // console.log(api.project.getProjects.useQuery())
  const {data: projects} = api.project.getProjects.useQuery()

  const [projectId, setProjectId] = useLocalStorage('devsage-projectid')

  const project = projects?.find(project => project.id === projectId)
  console.log(projects)

  return {
    projects,
    project,
    projectId,
    setProjectId
  }
}

export default useProject