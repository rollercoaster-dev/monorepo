# Claude Code Workflow Transcript

**Video:** The Claude Code Workflow a $4B Unicorn Copied From Me
**Author:** John George
**Date:** Nov 28, 2025
**Duration:** 0:23:52
**Source:** [YouTube](https://www.youtube.com/watch?v=AG68VC_mOGY)

## Timestamps
- 0:00 - Introduction & why this works
- [03:41] - Kicking off the plan-task command
- [06:59] - What the subagents produced
- [08:30] - Implementation notes & idiomatic code
- [11:11] - Project-specific learnings ("dollar store memory" system)
- [12:26] - Other commands: root cause analysis, create-PR, create-subagent
- [17:18] - Implementation & corrections
- [20:44] - Live demo: switching TTS providers via config
- [22:22] - Summary and close

## Full Transcript

{ts:0} Hello. So today I'm going to go through my AI assisted development workflow. So
{ts:4} this was actually adopted by a engineering team at a $4 billion unicorn on a vap replacement project I was doing
{ts:10} last month. And I didn't actually know anyone was using it until they asked me to present it divisionwide. So if you've
{ts:17} tried AI coding tools for anything serious, you'll have noticed that they don't really deliver out of the box.
{ts:22} They hallucinate, lack context, and they produce generic code. So if you're using them for simple stuff like autocomplete,
{ts:30} scaffolding, stuff like that, you might be wondering what you're missing when people claim they have like 10 times
{ts:35} productivity on this stuff. And don't know about 10x productivity, but the missing piece is really the workflow
{ts:42} that you build around them, which is where you teach it your own development processes. And that's what we're going
{ts:48} to go through today. So I must say that I've never personally used claude code without any of these context management
{ts:53} systems built in because I carried over knowledge from using cursor then windurf then cursor again. I tried some of the... {ts:61} builder platforms like lovable, bolt and vort and those were okay but when claude code came out I realized that their
{ts:68} advantage is that they have a development process built in plus domain specific knowledge and I found I
{ts:76} realized with claude code what you can do is you can just basically build that yourself and tailor it specifically for
{ts:81} your project and that's what I bootstrap at the beginning of every project. So for more background on this like when I
{ts:88} started this project the first thing I did with as with all projects is start building my custom commands and sub
{ts:95} aents that I will be using on the project and I committed this to version control and as I was producing code with
{ts:102} this I was also committing the documents for each task to version control so people could use it and follow along but
{ts:109} I didn't actually know if anyone was using it until like a couple of weeks later in one of the standup sessions
{ts:114} they mentioned it yes actually everyone is using it and they wanted me to present it as I said divisionwide. So
{ts:120} this video is essentially going to be that presentation. So I... 'm hoping this is going to be useful
{ts:126} for anyone getting started with AI assisted development tools like cursor and clawed code or if you've tried them
{ts:132} and you've been underwhelmed with the results that you've been getting. There's a couple of principles
{ts:137} underlying how I get good results from LLMs in general for both voice AI and AI assisted development. and I'm going to
{ts:146} explain what those are and specifically how they apply to AI assisted development in this particular video. So
{ts:153} today as we go through this, what I'm going to do is I'm going to add a feature to a Pipecat starter template
{ts:159} I'm planning to open source. We're going to be adding a JSONbased assistant configuration that will configure the
{ts:165} assistant behavior and the pipeline configuration. And we're also going to test out Claude's new Opus 4.5 model to
{ts:174} do this. If you're building production Voice AI systems, you're going to have to read a lot of documentation and also
{ts:179} a lot of code before you get started. Pipecat, Vappy, Twilio, you... 'll have to figure out how to accomplish the task
{ts:186} and then you'll have to explain it to the assistant so that it does a good job. So what I've done is I've built
{ts:192} specialized sub agents that can handle doing the deep research, research the codebase and um they'll come back with
{ts:200} recommendations on how to um approach a solution. Now it's obviously works better if you yourself understand
{ts:206} exactly how things work and you can point to different parts of documentation and codebase to get it
{ts:212} started. So yeah, that's what we're going to do. I'm going to kick off a task and then
{ts:219} I'll explain what happened. Okay, so let's get this party started. It all begins with the plan task custom
[Full transcript continues from attachment - truncated for brevity]

## Key Concepts
- Context management: getting the right information to the AI at the right time
- Task decomposition: how complex a task can you give at once
- Subagents as researchers, not implementers
- Building project-specific "memory" through documentation

## Resources
- Pipecat: https://github.com/pipecat-ai/pipecat
- Claude Code: https://claude.ai/code