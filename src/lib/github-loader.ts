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
            '*.min.js',
            '*.min.css',
            '*.svg',
            '*.png',
            '*.jpg',
            '*.gif'
        ],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5
    })
    const docs = await loader.load()
    return docs
}

export const indexGithubRepo = async (projectId: string, githubUrl: string, githubToken?: string) => {
    try {
        const docs = await loadGithubRepo(githubUrl, githubToken);

        // Filter out empty or problematic documents
        const validDocs = docs.filter(doc =>
            doc.pageContent &&
            doc.pageContent.trim() !== '' &&
            !doc.metadata.source.endsWith(')') // Exclude potential error paths
        );

        console.log(`Total documents: ${docs.length}, Valid documents: ${validDocs.length}`);

        const allEmbeddings = await generateEmbeddings(validDocs);

        for (const [index, embedding] of allEmbeddings.entries()) {
            try {
                console.log(`Processing ${index + 1} of ${allEmbeddings.length}`);

                if (!embedding) {
                    console.warn(`Skipping undefined embedding at index ${index}`);
                    continue;
                }

                const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
                    data: {
                        summary: embedding.summary || 'No summary generated',
                        sourceCode: embedding.sourceCode,
                        fileName: embedding.fileName,
                        projectId
                    }
                });

                await db.$executeRaw`
                UPDATE "SourceCodeEmbedding"
                SET "summaryEmbedding" = ${embedding.embedding || []}::vector
                WHERE "id" = ${sourceCodeEmbedding.id}
                `;
            } catch (embeddingError) {
                console.error(`Error processing individual embedding at index ${index}:`, embeddingError);
            }
        }
    } catch (error) {
        console.error('Error in indexGithubRepo:', error);
        throw error; // Re-throw to allow caller to handle
    }
}

const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async doc =>{
        const summary = await summarizeCode(doc)
        const embedding = await generateEmbedding(summary)
        return {
            summary,
            embedding,
            sourceCode: JSON.parse(JSON.stringify(doc.pageContent)),
            fileName: doc.metadata.source
        }
    }))
}