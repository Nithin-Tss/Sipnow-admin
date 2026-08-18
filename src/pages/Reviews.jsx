import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Truck } from "lucide-react";
import { api } from "../lib/api";
import PaginationBar from "../components/PaginationBar";
import LoadingSpinner from "../components/LoadingSpinner";

// ── Shared ───────────────────────────────────────────────────────────────────

function Stars({ rating }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={
            n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
          }
        />
      ))}
    </div>
  );
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PER_PAGE = 20;

// ── Service Reviews tab ──────────────────────────────────────────────────────

function ServiceReviews() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-service-reviews", page],
    queryFn: () =>
      api.get(
        `/admin/service-reviews?page=${page}&limit=${PER_PAGE}`,
      ),
    placeholderData: (prev) => prev,
  });

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const avg = data?.averageRating;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      {avg != null && (
        <div className="flex items-center gap-3 bg-white border border-gray-100 px-5 py-4 w-fit">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Average Rating
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">
                {avg.toFixed(1)}
              </span>
              <Stars rating={Math.round(avg)} />
              <span className="text-xs text-gray-400">
                ({total} review{total === 1 ? "" : "s"})
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Order</th>
              <th className="text-left px-4 py-3 font-medium">Rating</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                Comment
              </th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(() => {
              if (isLoading) {
                return (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      <LoadingSpinner />
                    </td>
                  </tr>
                );
              }
              if (reviews.length === 0) {
                return (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      <Truck size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No service reviews yet.</p>
                      <p className="text-xs mt-1 opacity-60">
                        Customers can rate their delivery experience after an
                        order is delivered.
                      </p>
                    </td>
                  </tr>
                );
              }
              return reviews.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">
                      {r.user.firstName} {r.user.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{r.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    #{r.order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={r.rating} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs">
                    <p className="line-clamp-2 text-xs">
                      {r.comment ?? <span className="text-gray-300">—</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell whitespace-nowrap">
                    {fmt(r.createdAt)}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          total={total}
          itemLabel="review"
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────

export default function Reviews() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Delivery & service ratings submitted by customers after delivery
        </p>
      </div>

      <ServiceReviews />
    </div>
  );
}
