
import { api } from '@/trpc/react'
import {useLocalStorage} from 'usehooks-ts'

const useProject = () => {
  const [projectId, setProjectId] = useLocalStorage('devsage-projectid')
  console.log(projectId)
  const {data: projects} = api.project.getProjects.useQuery()

  const project = projects?.find(project => project.id === projectId)

  return {
    projects,
    project,
    projectId,
    setProjectId
  }
}

export default useProject