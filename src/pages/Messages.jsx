import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MailOpen, Mail } from "lucide-react";
import { api } from "../lib/api";
import PaginationBar from "../components/PaginationBar";
import LoadingSpinner from "../components/LoadingSpinner";

const PER_PAGE = 20;

function fmt(iso) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Messages() {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact-messages", page],
    queryFn: () =>
      api.get(`/admin/contact-messages?page=${page}&limit=${PER_PAGE}`),
    placeholderData: (prev) => prev,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/contact-messages/${id}/read`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] }),
  });

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const unread = data?.unread ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  function toggleExpand(msg) {
    setExpandedId((prev) => (prev === msg.id ? null : msg.id));
    if (!msg.read) markReadMutation.mutate(msg.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Enquiries submitted through the storefront contact form
          </p>
        </div>
        {unread > 0 && (
          <span className="border border-gray-400 text-gray-800 px-2 py-0.5 text-xs uppercase tracking-wide">
            {unread} unread
          </span>
        )}
      </div>

      <div className="bg-white border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {(() => {
            if (isLoading) {
              return (
                <div className="px-4 py-12 text-center text-gray-400">
                  <LoadingSpinner />
                </div>
              );
            }
            if (messages.length === 0) {
              return (
                <div className="px-4 py-12 text-center text-gray-400">
                  <Mail size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No messages yet.</p>
                  <p className="text-xs mt-1 opacity-60">
                    Submissions from the storefront contact form will show up
                    here.
                  </p>
                </div>
              );
            }
            return messages.map((m) => {
              const isExpanded = expandedId === m.id;
              return (
                <div key={m.id}>
                  <button
                    onClick={() => toggleExpand(m)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50/50"
                  >
                    <span className="mt-0.5 shrink-0 text-gray-300">
                      {m.read ? (
                        <MailOpen size={16} />
                      ) : (
                        <Mail size={16} className="text-primary" />
                      )}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${m.read ? "text-gray-700" : "font-semibold text-gray-900"}`}
                        >
                          {m.name}
                        </span>
                        <span className="text-xs text-gray-400 truncate">
                          {m.email}
                        </span>
                      </span>
                      <span
                        className={`block text-xs mt-0.5 truncate ${m.read ? "text-gray-400" : "text-gray-600 font-medium"}`}
                      >
                        {m.subject}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                      {fmt(m.createdAt)}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-11">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-4">
                        {m.message}
                      </p>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          itemLabel="message"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
