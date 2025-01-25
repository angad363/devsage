import {GithubRepoLoader} from '@langchain/community/document_loaders/web/github'
import { Document } from '@langchain/core/documents'
import { generateEmbedding, summarizeCode } from './gemini'
import { db } from '@/server/db'

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '',
        branch: 'main',
        ignoreFiles: [
            'package-lock.json',
            'yarn.lock',
            'pnpm-lock.yaml',
            'bun.lockb',
            // Add more file types to ignore
            '.min.js',
            '.min.css',
            '.svg',
            '.png',
            '.jpg',
            '.gif',
            '.json',
            '.gitignore',
            '.dockerignore'
        ],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 2
    })
    const docs = await loader.load()
    return docs
}

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);

    // Prioritize files by extension
    const prioritizedExtensions = ['.py', '.js', '.tsx', '.jsx', '.java', '.html', '.css', '.yml', '.ipynb'];
    const prioritizedDocs = docs.sort((a, b) => {
        const aPriority = prioritizedExtensions.some(ext => a.metadata.source.endsWith(ext)) ? 0 : 1;
        const bPriority = prioritizedExtensions.some(ext => b.metadata.source.endsWith(ext)) ? 0 : 1;
        return aPriority - bPriority;
    });

    // Log prioritized files
    prioritizedDocs.forEach(doc => console.log(`File: ${doc.metadata.source}, Size: ${doc.pageContent.length}`));

    const allEmbeddings = await generateEmbeddings(prioritizedDocs);
    await Promise.all(allEmbeddings.map(async (embedding, index) => {
        console.log(`Processing ${index} of ${allEmbeddings.length}`);
        if (!embedding) return;

        const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
            data: {
                summary: embedding.summary,
                sourceCode: embedding.sourceCode,
                fileName: embedding.fileName,
                projectId
            }
        });

        await db.$executeRaw`
        UPDATE "SourceCodeEmbedding"
        SET "summaryEmbedding" = ${embedding.embedding}::vector
        WHERE "id" = ${sourceCodeEmbedding.id}
        `;
    }));
};

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async doc =>{
        const summary = await summarizeCode(doc)
        console.log('Embedding Input:', summary);
        const embedding = await generateEmbedding(summary);
        // console.log('Embedding Output:', embedding);

        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source
        }
    }))
}