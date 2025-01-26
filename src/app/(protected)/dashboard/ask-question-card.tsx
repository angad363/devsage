'use client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import useProject from '@/hooks/use-project'
import Image from 'next/image'
import React, { useState } from 'react'

const AskQuestionCard = () => {
    const {project} = useProject()
    const [question, setQuestion] = useState('')
    const [open, setOpen] = useState(false)
    console.log('Dialog open state:', open);

    const onSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setOpen(true)
    }

  return (
    <>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        <Image src='/logo.png' alt='devsage' width={80} height={80} />
                    </DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>

        <Card className='relative col-span-3'>
            <CardHeader>
                <CardTitle>Ask a question</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit}>
                    <Textarea placeholder='Which file should I edit to change the home page?' value={question} onChange={e => setQuestion(e.target.value)} />
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