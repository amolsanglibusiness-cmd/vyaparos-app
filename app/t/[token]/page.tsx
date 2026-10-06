import LedgerClient from './LedgerClient';

// Static Export साठी किमान १ पॅरामीटर असणे आवश्यक आहे
export function generateStaticParams() {
    return [{ token: 'preview' }];
}

export default function PublicLedgerPage({ params }: { params: { token: string } }) {
    return <LedgerClient token={params.token} />;
}