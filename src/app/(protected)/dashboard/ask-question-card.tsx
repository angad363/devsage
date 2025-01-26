'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import useProject from '@/hooks/use-project'
import React, { useState } from 'react'

const AskQuestionCard = () => {
    const {project} = useProject()
    const [question, setQuestion] = useState('')

    const onSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        window.alert(question)
    }

  return (
    <>
        <Card className='relative col-span-2'>
            <CardHeader>
                <CardTitle>Ask a question</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit}>
                    <Textarea placeholder='Which file should I edit to change the home page?' />
                    <div className='h-4'></div>
                    <Button type='submit'>
                        Ask DevSage!
                    </Button>
                </form>
            </CardContent>
        </Card>
    </>
  )
}

export default AskQuestionCard