import { useEffect, useState } from 'react';
import { getIncomingRequests, getOutgoingRequests, respondRequest } from '../services/friends';
import type { User } from '../types/user.type';

interface FriendRequestDTO {
    id: number;
    sender?: User | null;
    receiver?: User | null;
    [key: string]: any;
}

const RequestItem: React.FC<{
    request: FriendRequestDTO;
    user: User | null;
    isIncoming: boolean;
    processing: boolean;
    onRespond?: (id: number, accept: boolean) => void;
}> = ({ request, user, isIncoming, processing, onRespond }) => {
    const userInfo = isIncoming ? request.sender : request.receiver;
    const name = `${userInfo?.profile?.name || ''} ${userInfo?.profile?.lastName || ''}`.trim();

    return (
        <div className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0">
            <div className="flex items-center gap-3">
                <img
                    src={userInfo?.profile?.avatar || '/default.png'}
                    className="w-12 h-12 rounded-full object-cover"
                    alt="avatar"
                />
                <div>
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-gray-500">{userInfo?.email}</div>
                </div>
            </div>

            {isIncoming ? (
                <div className="flex gap-2">
                    <button
                        disabled={processing}
                        onClick={() => onRespond?.(request.id, true)}
                        className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                    >
                        {processing ? 'Procesando...' : 'Aceptar'}
                    </button>
                    <button
                        disabled={processing}
                        onClick={() => onRespond?.(request.id, false)}
                        className="px-3 py-1 bg-red-50 text-red-600 rounded border disabled:opacity-50"
                    >
                        Rechazar
                    </button>
                </div>
            ) : (
                <div className="text-sm text-gray-500">Pendiente</div>
            )}
        </div>
    );
};

export default function NotificationsPage() {
    const [incoming, setIncoming] = useState<FriendRequestDTO[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequestDTO[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<Record<number, boolean>>({});

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [inc, out] = await Promise.all([getIncomingRequests(), getOutgoingRequests()]);
                if (!mounted) return;
                setIncoming((inc as FriendRequestDTO[]) || []);
                setOutgoing((out as FriendRequestDTO[]) || []);
            } catch (e: any) {
                console.error('Error cargando solicitudes', e);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const onRespond = async (requestId: number, accept: boolean) => {
        setProcessing((p) => ({ ...p, [requestId]: true }));
        try {
            await respondRequest(requestId, accept);
            setIncoming((prev) => prev.filter((r) => r.id !== requestId));
            setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? err?.message ?? 'Error al responder la solicitud';
            window.alert(msg);
        } finally {
            setProcessing((p) => ({ ...p, [requestId]: false }));
        }
    };

    if (loading) return <div className="p-6">Cargando...</div>;

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Solicitudes</h2>

            <section className="mb-6 bg-white p-4 rounded shadow">
                <h3 className="font-medium mb-2">Entrantes</h3>
                {incoming.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes solicitudes entrantes.</div>
                ) : (
                    incoming.map((r) => (
                        <RequestItem
                            key={r.id}
                            request={r}
                            user={r.sender || null}
                            isIncoming={true}
                            processing={!!processing[r.id]}
                            onRespond={onRespond}
                        />
                    ))
                )}
            </section>

            <section className="bg-white p-4 rounded shadow">
                <h3 className="font-medium mb-2">Enviadas</h3>
                {outgoing.length === 0 ? (
                    <div className="text-sm text-gray-500">No tienes solicitudes pendientes enviadas.</div>
                ) : (
                    outgoing.map((r) => (
                        <RequestItem
                            key={r.id}
                            request={r}
                            user={r.receiver || null}
                            isIncoming={false}
                            processing={!!processing[r.id]}
                        />
                    ))
                )}
            </section>
        </div>
    );
}