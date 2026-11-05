export class ListQuery {
    constructor(
        public readonly page: number = 1,
        public readonly pageSize: number = 10,
        public readonly sortBy: string = "createdAt",
        public readonly sortOrder: "asc" | "desc" = "desc",
        public readonly search: string = "",
    ) {}

    static fromSearchParams(searchParams: URLSearchParams): ListQuery {
        const page = parseInt(searchParams.get("page") ?? "1", 10);
        const pageSize = parseInt(searchParams.get("pageSize") ?? "10", 10);
        const sortBy = searchParams.get("sortBy") ?? "createdAt";
        const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc";
        const search = searchParams.get("search") ?? "";
        return new ListQuery(page, pageSize, sortBy, sortOrder, search);
    }

    get skip(): number {
        return (this.page - 1) * this.pageSize;
    }

    toPagination(totalItems: number): { totalItems: number; totalPages: number; currentPage: number; pageSize: number } {
        const totalPages = Math.ceil(totalItems / this.pageSize);
        return {
            totalItems,
            totalPages,
            currentPage: this.page,
            pageSize: this.pageSize,
        };
    }
}