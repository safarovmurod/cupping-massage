// Git-connected Pages uses main for Production; previews need a separate backend.
export function assertCloudflareStage(stage: string | undefined, branch: string | undefined) {
  if (!branch?.trim()) {
    throw new Error('Cloudflare Pages configuration: CF_PAGES_BRANCH is required.')
  }
  if (branch === 'main') {
    if (stage !== 'production') {
      throw new Error('Cloudflare Pages main builds require VITE_DEPLOY_STAGE=production.')
    }
  } else if (stage !== 'preview') {
    throw new Error('Cloudflare Pages preview builds require VITE_DEPLOY_STAGE=preview and a dedicated staging Supabase project.')
  }
}
