With the advancement of AI and the 
 increasing power of each new model being 
 released, the way we produce code has 
 been completely transformed. There are 
 now many tools specialized for coding 
 like claude code, cursor, anti-gravity, 
 and others, each with its own unique 
 capabilities. But good models alone 
 don't determine the quality of the code 
 you produce. How you use the tool and 
 manage context matters just as much. All 
 of these tools have some inherent 
 mechanism for context engineering, but 
 cursor just made a major push for a new 
 approach, building it natively into the 
 app itself. As I went through their 
 article, I realized these principles are 
 genuinely strong. We have a lot to talk 
 about today because these ideas can be 
 applied broadly to any platform you use 
 to build applications. Context 
 management has always been critical when 
 working with AI agents because good 
 context management determines the output 
 quality. We have previously talked in 
 our videos about how important context 
 management is and talked about workflows 
 for it. Cursor implemented context 
 management features directly into their 
 product and released an article about 
 it. These principles are based on their 
 observation that to get good results 
 from models, it's better to provide as 
 few details as possible in the context 
 window. The less information the model 
 receives at once, the less data it has 
 to process at once, meaning lesser 
 confusion and more focus on the task it 
 needs to do at the moment because only 
 relevant information is included. This 
 approach is what they call dynamic 
 context discovery. The idea is 
 structured note-taking. That is the 
 information not needed right now should 
 not be in the context window. Excluding 
 potentially confusing or contradictory 
 details improves the quality of the 
 agents responses significantly. Cursor's 
 current release adds five dynamic 
 context management methods rolling out 
 to users soon. Even though cursor is 
 implementing this as a product update, 
 these principles are widely transferable 
 to all AI agents. The first update 
 cursor mentioned is that long tool 
 responses should go into files. MCPS 
 often return large responses that stay 
 in the context window. Not all of the 
 information from the responses is always 
 needed. Cursor mentioned that the common 
 approach of the most coding tools is to 
 truncate long MCP responses which leads 
 to data loss or important information 
 that might be necessary for the context 
 being removed. Claude's Chrome extension 
 is a very tool-heavy extension and just 
 a few prompts can fill up the context 
 because of loading a huge chunk into the 
 context window. So, I added an 
 instruction in the claw.md file that any 
 MCP tool response greater than 50 lines 
 must be saved to an MCP folder within 
 the context folder by running an echo 
 command in the terminal. When I ran the 
 Chrome extension to analyze the UI of a 
 landing page, whenever Claude came 
 across a tool like read page that 
 significantly bloat the context window, 
 it saved the MCP response into a file 
 for further reading using which it 
 analyzed the whole page and gave me a 
 report. This workaround improved the 
 accuracy of the tool response analysis 
 by letting Claude analyze the responses 
 from files as many times as needed and 
 eliminated the need for repetitive tool 
 calls. When data from previous MCP calls 
 is needed, Claude can read it directly 
 from the context folder instead of 
 making tool calls, saving significant 
 time. Before we move on to the next 
 change, let's hear it from our sponsor, 
 Zenrose. If you're building AI products, 
 automations, or datadriven systems, you 
 already know one thing. Everything 
 starts with reliable web data, but 
 getting clean, structured data at scale 
 is harder than it sounds. That's where 
 Zenrose fits perfectly into the stack. 
 Zenrose handles data extraction from 
 complex websites while automatically 
 managing antibbot bypass so you can 
 focus on what actually matters using the 
 data. Instead of dealing with messy 
 outputs, Zenrose delivers structured 
 results like JSON or Markdown, ready to 
 plug directly into your pipelines. It's 
 integration ready and business focused, 
 which makes it ideal for AI startups, 
 data teams, and automation builders who 
 don't want to babysit infrastructure. 
 Whether you're enriching leads, powering 
 AI agents, or automating research, 
 Zenrose just works. If your work depends 
 on web data, Zenrose belongs in your 
 stack. Click the link in the pinned 
 comment and start building today. We 
 know that the summarization step when 
 the context window is filled is messy 
 and leads to losing a lot of 
 information. Most tools including cursor 
 and clawed code trigger a summarization 
 step and start the session with a fresh 
 context window with the summary as a 
 starting point. When you hit compact 
 again and again, the summary starts to 
 forget details that might be important 
 to you but that the model summary may 
 miss. There is only so much control you 
 have over autocompaction and repeated 
 compression leads to the loss of crucial 
 information if you have to do it 
 repeatedly. Cursor's solution is to save 
 all previous chat history as a file for 
 the agent to reference later. When we 
 provide a very specific prompt and the 
 model cannot find the information in the 
 summary, the previous transcript serves 
 as its knowledge base. The model uses 
 that transcript to generate the solution 
 allowing it to recover anything that was 
 lost from the summary until cursors 
 implementation rolls out and becomes 
 available for everyone. I tried 
 implementing this feature with clawed 
 code. I added the instruction inside the 
 claw.md file to update the chat history 
 after each turn, documenting all the key 
 decisions and steps taken. It used a 
 history folder inside the docontext 
 folder with each file's name reflecting 
 the session. So whenever I ask it to 
 perform any task at the end of its task 
 execution session, it documents the chat 
 history into the corresponding history 
 file, adding everything to that file. 
 This way the context folder contains 
 detailed records of all sessions and 
 everything that was done. Agents were 
 given skills to help manage the context 
 problem MCPs were causing. The whole 
 purpose of skills is to make agents 
 provide better ability to use its own 
 capabilities by guiding through scripts 
 and instruction files, reducing context 
 bloat by progressive disclosure. 
 Anthropic was the first to come up with 
 the idea which is basically giving the 
 agents a set of instructions, scripts, 
 and resources that the agent can 
 discover and use to perform better at 
 specific tasks. Anthropic basically 
 open- sourced these agent skills, 
 setting a standard that others could 
 implement. Following this, Codeex, 
 Gemini, and others started implementing 
 agent skills. After which, it was 
 finally cursor's turn to do the same. 
 Cursor skills are basically the same 
 executables and scripts bundled together 
 into a single skill that the agent can 
 use for its respective tasks. Only the 
 skills name and description are in the 
 static context. Once they are inside the 
 static context, the agents can pull 
 their skills on their own using Grep and 
 cursor semantic search. This is what 
 makes it different because cursor 
 semantic search uses its own embedding 
 model and indexing pipelines in the 
 background instead of plain pattern 
 matching like regx based searches in GP 
 commands. Claude skills only expose the 
 name and description in the context no 
 matter how many files the script uses, 
 preventing context bloat. In my project, 
 I had configured five skills, each 
 consuming very few tokens, only about 
 0.2% of the total, leaving more room for 
 working. What's different is that Claude 
 skills can also be accessed via 
 /comands, letting you manually trigger 
 them whenever needed, addressing 
 people's complaints about skills not 
 being loaded on demand properly. MCPS 
 [snorts] contain a lot of tools, all 
 exposed in the context window, bloating 
 the context window unnecessarily. Cursor 
 took it upon themselves and emphasized 
 that it is the responsibility of the 
 coding agents, not the MCP servers, to 
 fix the context bloat. The solution for 
 this was dynamic context discovery by 
 syncing tool descriptions in a folder. 
 Cursor's idea is to have all of the MCPS 
 with their names in separate folders 
 named after each connected MCP. And 
 within each folder, all the tools must 
 be listed. With this, the agent only 
 receives the names of tools. And 
 whenever it needs any tool, it looks it 
 up through the folders. In the testing 
 they did, they discovered that dynamic 
 discovery of MCP tools reduced usage by 
 46.9% 
 which makes a huge difference if you are 
 working on a longunning system. This 
 implementation also helps in cases where 
 MCP servers accidentally get 
 disconnected or require 
 reauthentication. Normally the system 
 would just forget about those tools but 
 now the agent can actually notify the 
 user that reauthentication is required. 
 Claude also has an advanced search tool 
 that is specifically designed to address 
 this problem using a certain set of 
 flags to let Claude know whether to load 
 it or not. It implements Cursor's exact 
 idea of dynamic context discovery, but 
 this is limited to the developer 
 platform and only for those building 
 with APIs. We cannot modify how MCPS are 
 used in cloud code because they are 
 built into it by anthropic. Just as I 
 was looking for ways to implement this 
 in cloud code, I came across a hidden 
 flag. Without setting this flag, all the 
 MCP tools I had connected were exposed 
 in the context of clawed code. When I 
 set the enable experimental MCP CLI 
 flag, all the tools were removed from 
 the context window, freeing up space 
 that was previously occupied by the MCP 
 tools. But that does not mean the MCPS 
 get disconnected when this CLI is 
 enabled. The only difference is that 
 they are not exposed up front in the 
 context window. Instead of putting all 
 the schemas into the context, Claude now 
 uses a middle bash layer called MCPLI 
 which handles all MCP related tasks. 
 Claude uses this middle layer to search, 
 get information, and invoke the tools. 
 Whenever you ask Claude to perform any 
 task that requires an MCP tool call 
 instead of using the usual method, it 
 uses the MCPS via MCP CLI and performs 
 the task it is required to do. By using 
 this tool, Claude executes all the tasks 
 as usual, just through this middle 
 layer. Reporting terminal errors is hard 
 in cursor because of its limited access. 
 If the terminal showed any error, you 
 needed to add it to the chat and then 
 have it fixed. Cursor's solution for 
 this is also moving the terminal 
 sessions to files. So whenever you ask 
 it any questions, it references those 
 history files and uses GP to extract the 
 relevant output. Since server logs are 
 usually longunning and contain lots of 
 noise for the agent, using the Grep task 
 is more efficient because it lets the 
 agent pattern match. They got this idea 
 from CLI based coding agents which run 
 the commands but then the output is 
 injected into the context exactly the 
 way claude code and others do by 
 default. Even though claude 
 intelligently handles this on its own, 
 we can manage it even further by using 
 instructions in claude.md to instruct it 
 to add all terminal logs into a file in 
 the terminal folder inside the context 
 folder. Basically, if Claude runs any 
 npm command, it runs a special command 
 that logs both the output stream and the 
 input stream into the document files. 
 Here, two represents the standard error 
 stream and one represents the standard 
 output stream. It writes these logs to 
 the terminal folder marking them with a 
 timestamp. Then, whenever it needs to 
 search through them, it simply uses a GP 
 command with a specified pattern and 
 loads the last 20 lines to extract only 
 what matters. So whenever I tested my 
 development server, it used these 
 commands and kept writing the terminal 
 runs to files in accordance with the 
 claude.md file. After running the 
 server, it referred to the log files and 
 figured out what was causing the issue 
 and fixed the problem for me. Now, even 
 though this add-on to claude code might 
 seem insignificant because it doesn't 
 appear to have much impact on immediate 
 work, it can be very useful when you 
 want to refer back to your app's 
 functioning. Just like when I needed to 
 identify which service was causing my 
 app to crash, I simply told Claude to 
 refer to the test logs instead of 
 running the tests again, saving me from 
 rerunning a 2-minute test suite just to 
 reproduce an error I had already seen. 
 That brings us to the end of this video. 
 If you'd like to support the channel and 
 help us keep making videos like this, 
 you can do so by using the super thanks 
 button below. As always, thank you for 
 watching and I'll see you in the next 
 one.