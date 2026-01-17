Okay, fine. I'll talk about Ralph loops.
You guys have been asking for a while,
and they are a really interesting topic.
They originally introduced by Jeff
Huntley all the way back in July, but
there's been a huge surge in interest
that is from a handful of different
things, all of which we'll talk about.
There are really cool things you can
build with Ralph loops. They
meaningfully increase the scope of the
tasks you can hand off to an AI and
expect it to complete. That said, there
are a lot of different ways to do Ralph
loops that vary in how useful they are
and how much they follow the original
vibe of what Jeff was trying to create
with the loops. Ryan Carson did a pretty
good job breaking down a step-by-step
guide on how to get Ralph loops working
and shipping code. He even put up a
GitHub repo that describes a lot of
this, includes a Ralph.sh file and
everything else you need. And Jeff
replied, "This isn't it." with a link to
a video about specifically why claude
codes implementation is not actually
Ralph loops. So the plugin you might be
using in things like cloud code probably
isn't a proper Ralph loop. There are a
lot of personal implementations like Ben
has his that he was using for an Elixir
app. Mickey from Convex has one that he
put up here that has a lot of
customization, additional features.
There's a lot to talk about here and I
want to try and break it down so you can
understand what a Ralph loop is whether
or not you want to use it and most
importantly how you can bring these
ideas into your day-to-day work to be
more effective as you use AI tools. That
said, I do have to quote Lee Quick. She
Ralph on my wigum until I merge. I'm
going to need therapy after that one.
So, let's hear a quick word from today's
sponsor before I go further. We recently
added a feature to T3 chat that I'm
really pumped about. We added the option
for you to sync your API keys across
different clients, which I was really
scared to do because I don't want to be
storing your API keys for various
services. That's a massive risk. We
wanted to make sure if we did it, we did
it right, which is why I'm so pumped
today's sponsor has an awesome feature
for this. The vault on work OS has made
this much easier for us to implement.
They have two options for how you can
use it. The obvious way, which is they
store the data and then you can access
it through their client, but they also
have a much cooler way where you store
the data. they just have the decryption
part on their side. So when a user tries
to access the data, they just get a
nonsense encrypted blob, unless they are
the right user, in which case it works
perfectly. And if you have users that
want to manage the encryption
themselves, they support that too. A
given user can bring their own key, not
have it stored in vault, and everything
will still just work. This is how works
tends to do things. They're not just
thinking about how do we get this
working on your indie side project.
They're thinking about how you make this
work at enterprise scale. How do you
handle all the edge cases and weird
expectations that enterprises want
without compromising on your developer
experience as a small team of people
that are building applications that are
now competing with these giant
companies? That's why everyone from
OpenAI to Enthropic to Cursor,
Perplexity, Verscell, FA, you get the
idea. Everyone's making the move to work
OS, including ourselves with T3 chat.
What are you waiting for? Try them out
now at soy.link/workos.
Before we dive into the history, I think
it's important to have a vague idea of
what a Ralph loop is. To put it simply,
it's executing your AI agents in a bash
loop so they keep going as long as they
need to. The way this is implemented can
vary a lot, but if we go to the original
Ralph post here, you can see the example
while true do cat prompt MD pipe that to
claude code and just keep doing this.
This version will literally run forever
and you have to manually stop it. And
this is what the creator of the Ralph
loop mostly does. said creator of the
Ralph Loop put together one of the most
chaotic videos I've ever seen all about
this. It's not the easiest watch. It
will be linked in the description if
you're curious, but I'm going to do my
best to distill the lessons from here
and the values you can get from it and
how you build. I think there are a lot
of things we can learn from this
strategy, even if we don't necessarily
use it the specific proposed way. Jeff
originally made the Ralph loop to build
something pretty crazy, which was a full
programming language from scratch. I
actually already made a video about this
way back when he did it because I
thought it was so cool. But in order for
it to do this, you have to change the
way the agents execute. Big part of how
agents execute is the context. When you
are doing work with a tool like claude
code, the history is being passed in for
the token generation. You have to
remember the way AI works is just next
token prediction. So if I say the
capital of the United States is, all the
AI is doing is guessing what the next
word would be based on all the previous
things in context. It does this through
a crazy mapping of parameters that allow
it to calculate based on the current
history of the chat and the tokens that
it has what the most likely next token
is. There are catches here though, in
particular, context limits. You can only
have so much text in the context before
these prediction algorithms get really
bad. Some models can go much further
than others, but that doesn't really
matter when the quality goes down as a
result. There's a term for the quality
going down, context rot, and it's really
important to remember this because it's
a big part of why Ralph loops are so
interesting. Context rot happens when
there is too much information in the
context, which causes the models to
behave worse. The solution tools like
Cloud Code have for this is compaction.
And you can trigger it by hand by typing
/compact or if you go over the context
window, it will do a compaction for you
where it sends the existing history to a
model says, "Hey, summarize this and
pull out any key details and then it
uses that as the history instead." So as
you're doing a back and forth with an AI
agent like cloud code curse or whatever
else every time you send a message that
gets added to the context then the model
does a bunch of stuff. This is now added
to the context. Then you send a followup
then the model adds even more and every
time anything is happening it is
appending. So this first message might
be 20 tokens. The response you get might
be I don't know let's say 5,000 tokens.
He's another 20 token follow-up and then
another 5,000 tokens. When you send this
20 token followup, the model isn't
parsing just those 20 tokens. It's the
20 plus the 20 plus the 5,000 from
before because it is going through and
sending the whole history. When you send
a message, everything before it is sent.
And then when you hit the limit or even
just get to the point where the context
is too bloated and the accuracy goes
down, things get worse. And as I said
before, the solution most tools use is
once they have this and it's too long,
the system will send a prompt that is
effectively summarize please. This
summary gets sent up to be a whole new
thing. We'll say that the summary
context is blue and it will take these
20,000 tokens and make it a much smaller
number. We'll say 5k tokens of summary
and then the model continues generating
like nothing happened. Kind of though
there are a lot of problems with this.
there are details that might get lost
like let's say you have a really
important detail here like always read
this specific file and then when the
model compacts your context it loses
that instruction. Now whatever context
you thought was important from here is
lost as well. One of the key points of a
Ralph loop is to throw this whole
compaction model away. Instead of having
each prompt add on to your history. The
goal of a Ralph loop is to break out
every follow-up prompt as its own new
history. There is a problem here though.
If you have information that was
important in the history, you lose it.
And that is where a lot of the
implementation details of the Ralph loop
come in. All of the details, all the
implementation, all of the things that
make it interesting are how do you get
the right information into this prompt
so that you can run this in a loop.
Instead of getting to the end and then
sending a follow-up, what if you get to
the end, you update some piece of
important information and then start a
new instance from scratch that will
continue the work that was happening
previously. Imagine a really good
engineer whose brain gets wiped whenever
they do too much work at once. So if you
you have this incredible engineer that
can build anything, but once they have
done too many lines of code, their
memory gets wiped and they have to start
from scratch. You're effectively
building techniques to catch them back
up the right amount fast enough that
they can get back to work efficiently.
And that's where a lot of the
interesting parts of Ralph loops come
in. I like how Ryan breaks this down,
even if it's not a proper Ralph loop. I
think it's a good example. It's a bash
loop that pipes a prompt into your
agent. The agent picks the next story
from a PRD, which is a plan document
that describes the work you want done.
The agent implements that story from it.
It runs type checks and tests. It
commits if passing, marks the story
done, logs the learnings, loops and
repeats until all of the work is done.
And this is the key, the memory
persistence. It only persists things
information memory by making git
commits. So it's staying there by
updating a progress.ext file with the
things it learns. So instead of keeping
the whole context, it just keeps the
important key parts. And the prdson
which keeps track of all of the statuses
for all of the tasks that are being
completed. There are lots of different
ways to implement this. For example, the
original creator, what he suggests doing
is going back and forth with the model a
bunch to write a thorough plan for what
you want to have done that has all of
the different tasks that need to be
completed in it. Have that in a file in
the codebase somewhere. In this case,
it's inspect/analytics
implementation plan.mmd. And the
important instruction here of pick the
most important thing to do, not go
through this in order. Pick what you
think is most important on here and work
on that. And once it's completed, the
next time you run it, it will pick
something different. And this markdown
file is updated when it is completing a
task. So he put in here, update the
implementation plan when the task is
done. That's the key. But this is also
where the Ralph Wigum plugin for Claude
code starts to have problems. The
original limitation was Jeff Huntley's
simple while true loop. This plugin
works quite a bit differently. The loop
happens inside your current session,
which sounds really convenient, but
sadly causes its own set of problems
because when it runs in one session, it
no longer has the clean history to start
from. It's constantly overflowing the
context window and then having to go
back and compact and losing track of
what it's doing. Sometimes as a result,
if you think of these things as boxes or
layers where we have on the outside
here, this is cloud code. In an ideal
world, following the official Ralph
Wigan mindset, the Ralph loop is a thing
that exists outside of Claude Code
because then it can kill it and
reinstantiate it whenever it wants to.
And Claude Code's history doesn't get to
control anything like it is effectively
taking Cloud Code out of control and the
source of truth is now the markdown or
JSON file that describes the work being
done and the bash loop that is
triggering the work to then continue
with a fresh agent. The problem with the
plugin is that it inverses this where
instead of the Ralph loop controlling
Cloud Code, Claude Code controls the
Ralph loop which means a lot of those
benefits disappear immediately. You're
effectively with this plugin preventing
Claude code from saying I am done. If
that is all you want the Ralph loop for,
you want it to just keep going
indefinitely and you don't care about
the compaction and you think it works
fine with the higher amounts of context
and the potential loss of important data
from the original prompt. Cool. You can
do that. But I've personally not had
much success with this and I think a lot
of the people that are struggling with
Ralph loops are probably using it that
way too. I know that's how I was using
it and I wasn't seeing much. But when I
talked to people like Ben who have been
using it the other way where he wraps
open code with it on the outside with a
script, they have seen much more success
and I'm planning on trying this myself
too. One more important piece is how do
you determine when it is done? The
classic Ralph loop implementation is to
stop it by hand. a person comes in and
halts it when they think the work is
probably done. For various reasons, this
might not be ideal, which is why other
implementations include some way for the
model to indicate that the work is
completed. For example, Ryan's
implementation, he specifies to the
model in the prompt that when it is
completed all of the work in the
planning file, it should output promise
complete close promise. And if we see
this inside of the results, then we exit
the loop. Otherwise, we keep going. You
can also set a number of max iterations
so that if it goes for too long, it will
automatically stop. Not everybody does
this, including Jeff, but you probably
should do this just to make sure you
don't waste all of your tokens. And this
will burn tokens, by the way. I'm sure
you know that going in, but make sure
you know that as you go in. Ryan also
posted examples of a prompt MD as well
as the PRD JSON. It is missing a bit of
important info at the top here. Like I
really like in Jeff's video he specifies
at the top study the specme file which
is the file that includes all of the
specs and roughly what the project is
and how it works so it has the right
amount of context in the right context
when it starts and then also study the
implementation plan that you're building
and pick the most important thing to do.
This gives you the right context at the
start which is one of the most important
things. If you don't have the whole
history because you don't keep the
history anymore, you need to put work in
to make sure that the right information
is inside of this first piece. Not
necessarily everything it needs to know
about the codebase, but the instructions
on what tople things it needs to know
about the codebase, as well as
instructions on how to find more
information that it might need.
Counterintuitively, it's actually
totally okay if in this box you tell it
to go read some file and then it has to
do work in every single one of these
instances to get the contents of that
file. That might seem like a waste. Like
why not just put that information in
directly? There's a bunch of reasons
why, but let the model determine if it
does or doesn't need that info. Just
make sure it knows where to find it. The
models have good tools for search, for
GP, for finding information, but they
don't know what information they should
be finding. And making sure you give it
the right path to the information is one
of the most important pieces. So, this
is an example of a prompt that gets fed
over and over again whenever a new
instance is created. The task, read the
PRD file, read the progress file, check
codebase patterns first, check you're on
the correct branch. Don't think you
really need to have that. Pick the
highest priority story where passes is
false. Implement the one story. Run type
checks and tests. Update agentsmd file
with learnings. Commit the feature.
Update the pd json and append learnings
to progress.ext. There is a problem with
this one which is that if it doesn't
finish the work in one pass, even if the
work is just one story, it's possible
one story or one task might fail or take
more than one run. Most of the emotions
I've seen here are check progress.ext
text to see if a task is in progress,
pick it up if it hasn't been completed
yet. And if you fail to complete it
before you run out of room, specify what
you learned in the process in
progress.ext. And then we have an
example of a PRD JSON. This can just be
a markdown file with checkboxes, too.
This is a pretty simple format though.
Branch name, then user stories as a
keyed array that has all of the stories
for this particular branch. Add login
form, acceptance criteria. These are
things that you expect it to do if
you've succeeded. They're not real
tests. But this is also one of those
things that's interesting about AI. This
is all super chaotic and
nondeterministic. But the definition of
criteria to accept can be a lot vagger.
Now, it could be that you write tests
and make sure they pass. It could be
that this capability exists and the
agent goes and validates it. As long as
they have the right tools to validate
and the right knowledge to make sure of
the thing being real, you can kind of
just put a string of text here and it
works, which is kind of crazy but also
awesome. And then the key piece here
passes being a boolean where once it's
true, this story can now be skipped and
other ones can be looked at. And again,
the model doesn't go through this and do
them one at a time. It looks at the list
and chooses the thing it thinks is most
important and goes and does it. I do
want to talk a bit more about acceptance
criteria because I think there are some
cool things you can do here. Obviously,
things like unit tests are more
important than ever. Type checks and
type check passing and having the right
commands for the model to do a type
check. Really useful stuff. Adding
pieces like the ability to do testing in
the browser using a browser skill of
some form so it can check in Chrome that
things behave as expected can be really
helpful, but also can be expensive and
slow the model down quite a bit. One
underrated thing that I have found to
actually be quite useful is using an AI
coding CLI, for example, Code Rabbit,
where you can have a tool call or even
have this as part of the loop where
after a run, it runs the Code Rabbit CLI
against the current diff, finds any
potential things that might be wrong
with that code, and then sends that as
part of the context to another agent
that will go and fix the things that it
caught. super super helpful and can
result in the code you ship being
significantly nicer. I'm considering
going even further and having a special
git instance that only the agents use
that has code rabbit running as a
pre-commit hook. In fact, pre-commit
hooks are one of those things that makes
a lot of sense when you're building this
way because you don't want it to commit
the code unless you're sure that it
works. Man, a lot of my takes on these
things are changing as a result of how
AI works. Like previously, I would never
have wanted to add pre-commit hooks to
any project because they make your life
as a developer so much worse. Like the
idea that you can't commit code unless I
validate a bunch of things first sucks
and I wouldn't want to put any human dev
through that, but I gladly put some
agents through it. One last important
point I want to make to like help with
your mental modeling here, especially as
you contrast with other solutions for
doing these types of big builds with AI.
Imagine you have a big project and
you've broken it down into tasks. If you
have a traditional endge job, it
wouldn't be uncommon to say, "Okay, uh,
person one gets these tasks, person two
gets these ones, and then these ones get
picked up by whoever has the spare time
and whoever finishes their work first."
You end up parallelizing a lot of the
work. So, different things can happen at
the same time. But once you do that,
things get way more complex. You have to
worry about conflicts. You have to worry
about people stepping on each other's
toes. You have to worry about things
that might be dependent on other things.
It can make stuff messy fast and if you
don't have memory because again that's
one of the core pieces agents lose
everything that they've done as soon as
you hit the context window and have to
compress it or move on. If you are
assigned to work on tasks six, seven,
and eight and it turns out seven is
blocked by two, you're going to keep
getting stuck realizing that over and
over again because that knowledge isn't
going to stay present unless you have a
way to do it. A big part of why the
Ralph loops are interesting is it throws
that whole model away. Instead of trying
to split the work up into various groups
that can be done by different people in
parallel, it says, "Hey, model, pick
what you think is most important to do
first." And it says, "Okay, task six."
So, it does six. And then it completes
it. Now, it's green because it's done.
Then you ask again, "What remaining task
is most important?" It looks at them
all, says, "I'm going to do three."
Okay, it does three. Now that's done.
And what happens is it is done linearly.
It is not done in a fixed order. It's
not one then two then three then four
then five then six. But it is done
linearly. It's six then three then one
then two. Not six and seven being done
at the same time as one and two are. By
throwing away the parallelism aspect.
You end up reducing a lot of the
complexity which allows this method to
be more reliable. That said, if the work
is separated enough, like tasks one and
two really are super different from
tasks seven and eight and you are
watching closely, maybe you can split
those up into parallel agents on your
machine. But if I've learned anything
from my time building with these tools,
it's that doing things in parallel can
get really frustrating really fast
because our development environments
just aren't built for that yet. If
you're running background agents using
tools like Cloud Code for web, like
Devon, like whatever the heck GitHub is
doing now or cursors background stuff,
then it might work. But I've just yet to
find a workflow where that works well
for me. I still prefer running these
things on my machine with my tools. One
last thing, cuz I think it's important
to understand the range of opinions
here. Peter here is one of the most
talented agentic coders I've ever seen.
He was a very legit engineer before the
AI stuff. He had an exit. He's doing
very well and he's coming back into
coding more than ever. I showed his
GitHub before. It legitimately looks
like unbelievable because he has so many
projects that he has been working on
actively recently. Like it's just crazy.
There are individual days where he's
shipping over 500 commits. He did 534 on
December 28th. Unreal. So you'd imagine
someone like this is Ralph looping super
hard, right? Nope. He mostly uses
Codeex. I found that codeex is actually
quite good at these super longunning
tasks and tends to be better at honoring
the original intent of the original
prompt when it does its compaction when
it runs for a while. Here is a change
that he had it make that touched 393
files, added 8,000 lines of code, and
deleted almost 7,000. Someone assumed
the prompt he used for this was super
complex and probably took a ton of
steps. It wasn't. He said, "Rename
providers to messaging channels." That
was the whole prompt. and the model was
able to go and do that for a super long
time. So if your reason for using
something like a Ralph loop is just to
complete longer tasks or have it work on
a thing for a longer amount of time, you
probably don't need it. I have had this
annoyance myself where I was writing a
plan, got it to approve the plan and
said, "Okay, implement it." Then it
stopped halfway through. It's like,
"Okay, I finished phase one. Let me know
what you think and when I should start
phase two." Does the Ralph loop solve
for this? Kind of. But it's still
annoying as hell. just absurdly so. And
I don't think that's the point either.
The goal of a Ralph loop isn't to solve
the problem that the agent stops too
early. The goal of the Ralph loop is to
let you build an entirely different way
where you are orchestrating agents in a
linear fashion to do lots of different
pieces of related work as part of a PRD
doc. This longer running work is a big
part of why Pete prefers codeex and GPT
5.2 over cloud code. He's even specified
in his writing in the past that he has
it unslopping old crimes from Opus 4.0.
And the big difference with codeex is it
will just silently read files for 10 to
15 minutes before it even starts writing
code. On one hand, that's annoying. On
the other, it's amazing because it
greatly increases the chance that it
fixes the right thing. Opus is much more
eager, which is great for small edits,
but not so good for larger refactors or
features. And as he specifies here, it
often doesn't read the whole file or
misses parts and then delivers
inefficient outcomes or misses
something. Remember earlier the file
here study spec/readme study
specs/analytics implementation plan.
These are things being used to make it
more likely the model starts from the
right place cuz that's really what this
all comes down to. The models are no
better than the context they have.
Everything we've talked today, be it
Ralph loops, be it the way Pete uses
codecs, be it all of the PRD stuff, it's
all about context engineering. And I've
avoided using that term until now
because I know as soon as I say it,
people's ears will just fall off and
their brains will fall out. That is a
thing that matters now. Making sure the
right cargo is on the train before it
goes off is a big part of how these
tools work and how we should use them
properly. And the point of all of this
is to do better context engineering to
set the agent up for the highest
likelihood of success. So in the end, a
Ralph loop is just calling an agent in a
loop via bash. How it's actually done
varies a lot. And hopefully what you get
out of this isn't I should go use a
Ralph loop. Rather, you're rethinking
how you manage the context of your
agents as you are using them to build
real software. This has been a chaotic
journey, but I hope you learned
something from it from the history of
Ralph loops to why they are useful. This
is a whole new world we're diving into,
and I get why people are excited. But we
really should try to learn the lessons
rather than the terms and tools that
people are hyped about. Hopefully, this
helps break that down for you. I know
it's been helpful as I've been learning
these things. Let me know what you
think. And until next time, peace nerds.
