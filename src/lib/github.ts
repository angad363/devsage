import { db } from "@/server/db";
import {Octokit} from "octokit"
import axios from 'axios'
import { summarizeCommit } from "./gemini";


export const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

type Response = {
    commitHash: string;
    commitMessage: string;
    commitAuthorName: string;
    commitAuthorAvatar: string;
    commitDate: string;
}

export const getCommitHashes = async (githubUrl: string): Promise<Response[]> => {
    const [owner, repo] = githubUrl.split('/').slice(-2)
    if(!owner || !repo){
        throw new Error("Invalid Github URL")
    }
    const {data} = await octokit.rest.repos.listCommits({
        owner,
        repo
    })
    const sortedCommits = data.sort((a: any, b: any) => new Date(b.commit.author.date).getTime() - new Date(a.commit.author.date).getTime()) as any[]

    return sortedCommits.slice(0, 10).map((commit: any) => ({
        commitHash: commit.sha as string,
        commitMessage: commit.commit.message ?? "",
        commitAuthorName: commit.commit?.author?.name ?? "",
        commitAuthorAvatar: commit.author?.avatar_url ?? "",
        commitDate: commit.commit?.author?.date ?? "",
    }))
}

export const pollCommits = async(projectId: string) => {
    const {project, githubUrl} = await fetchProjectGithubUrl(projectId)
    const commitHashes = await getCommitHashes(githubUrl)
    const unprocessedCommits = await filterUprocessedCommits(projectId, commitHashes)
    const summaryResponses = await Promise.allSettled(unprocessedCommits.map(commit => {
        return summarizeCommits(githubUrl, commit.commitHash)
    }))
    const summaries = summaryResponses.map((response) => {
        if(response.status === 'fulfilled'){
            return response.value as string
        }
        return ""
    })

    const commits = await db.commit.createMany({
        data: summaries.map((summary, index) => {
            console.log(`Processing commit ${index}`)
            return {
                projectId: projectId,
                commitHash: unprocessedCommits[index]!.commitHash,
                commitMessage: unprocessedCommits[index]!.commitMessage,
                commitAuthorName: unprocessedCommits[index]!.commitAuthorName,
                commitAuthorAvatar: unprocessedCommits[index]!.commitAuthorAvatar,
                commitDate: unprocessedCommits[index]!.commitDate,
                summary
            }
        })
    })

    return commits
}

async function summarizeCommits(githubUrl: string, commitHash: string){
    // get the diff, then parse the diff in AI
    const {data} = await axios.get(`${githubUrl}/commit/${commitHash}.diff`, {
        headers: {
            Accept: 'application/vnd.github.v3.diff'
        }
    })

    return await summarizeCommit(data) || ""
}

async function fetchProjectGithubUrl(projectId: string){
    const project = await db.project.findUnique({
        where: {id: projectId},
        select: {
            githubUrl: true
        }
    })

    if(!project?.githubUrl){
        throw new Error("Project has no github url")
    }

    return {project, githubUrl: project?.githubUrl}
}

async function filterUprocessedCommits(projectId: string, commitHashes: Response[]) {
    const processedCommits = await db.commit.findMany({
        where: {
            projectId
        }
    })
    const unprocessedCommits = commitHashes.filter((commit) => !processedCommits.some((processedCommit) => processedCommit.commitHash === commit.commitHash))
    return unprocessedCommits
}

// Add this at the bottom of your github.ts file
// async function testCommitAvatarExtraction(githubUrl: string) {
//     try {
//         console.log('Testing commit avatar extraction for:', githubUrl);

//         // Extract owner and repo from URL
//         const [owner, repo] = githubUrl.split('/').slice(-2)

//         // Fetch commits directly from Octokit
//         const {data} = await octokit.rest.repos.listCommits({
//             owner,
//             repo,
//             per_page: 10  // Limit to 10 most recent commits
//         })

//         // Detailed logging of commit information
//         console.log('Total commits fetched:', data.length);

//         data.forEach((commit, index) => {
//             console.log(`\n--- Commit ${index + 1} ---`);
//             console.log('Commit SHA:', commit.sha);
//             console.log('Commit Message:', commit.commit.message.split('\n')[0]);

//             // Log author information
//             console.log('Author Name:', commit.commit.author?.name);
//             console.log('Author Email:', commit.commit.author?.email);

//             // Multiple strategies to log avatar URL
//             console.log('Avatar URL Attempts:');
//             console.log('1. commit.author?.avatar_url:', commit.author?.avatar_url);
//             console.log('2. commit.committer?.avatar_url:', commit.committer?.avatar_url);
//             console.log('3. commit.author?.login:', commit.author?.login);
//             console.log('4. GitHub Avatar URL:',
//                 commit.author?.login
//                     ? `https://github.com/${commit.author.login}.png`
//                     : 'No GitHub username found'
//             );
//         });

//         // Use the existing getCommitHashes function to see processed result
//         const processedCommits = await getCommitHashes(githubUrl);
//         console.log('\n--- Processed Commits ---');
//         processedCommits.forEach((commit, index) => {
//             console.log(`\nCommit ${index + 1}:`);
//             console.log('Commit Hash:', commit.commitHash);
//             console.log('Author Name:', commit.commitAuthorName);
//             console.log('Avatar URL:', commit.commitAuthorAvatar);
//         });

//     } catch (error) {
//         console.error('Error testing commit avatar extraction:', error);
//     }
// }

// await testCommitAvatarExtraction("https://github.com/docker/genai-stack")

// await pollCommits("cm68t7xjy00002hek9lml8kgn").then(console.log)