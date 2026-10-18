# Deployment guide

## Vercel

1. Import the GitHub repository into Vercel and set **Root Directory** to `web`, Framework Preset to Next.js, and Node.js to 22.
2. Deploy on Hobby for a personal, non-commercial portfolio. The app has a dated local snapshot mode and requires no external credentials initially.
3. Verify `/`, both pairs, `/brief`, and `/api/workbook` from the actual deployment URL. The footer must read *Local dated snapshot · Azure service not connected* until Azure is live.

## Azure Functions

1. Confirm eligibility and available credit for **Azure for Students** in the user's own Microsoft account. Create a spending limit/budget alert and confirm region and plan costs before enabling resources. Azure Functions' free grant does not mean all supporting resources are free; storage can incur charges.
2. Create a Python 3.12 Function App using the Functions v2 programming model, a Flex Consumption hosting plan if available for the subscription and region, and a required storage account. Publish the `azure/` directory. The code serves `GET /api/analysis?pair=KO-PEP` or `MSFT-ORCL` and `POST /api/scenario` with `{ "symbol": "MSFT", "growth": 0.15, "margin": 0.45 }`.
3. Configure Vercel server-side environment variables `AZURE_FUNCTION_URL` (host only) and `AZURE_FUNCTION_KEY` (function or host key). Do not prefix these with `NEXT_PUBLIC_` and do not put them into source control. Redeploy Vercel.
4. Verify the dashboard identifies **Azure calculation** for the scenario and **Calculations served by Azure Functions** in the footer, then test both API routes. Keep the fallback available for outages. Never put the Function key in browser requests.

The Vercel proxy accepts only two pair identifiers and bounded scenario assumptions. Historical GET responses are cached by the Vercel edge for one hour. Scenario and workbook routes have best-effort process-local request caps. For a public, higher-traffic deployment, add durable rate limiting in front of the Azure Function; process-local caps are not reliable across Vercel instances. Monitor Azure request counts and budget usage. The Function App uses the built-in function authorization level.

## Public repository

The GitHub repository is currently private. The dashboard does not link to it for visitors. Make it public only after reviewing the file list, Git history, and visibility setting; publishing the portfolio site does not require a public source repository.
