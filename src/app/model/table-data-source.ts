import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { DataSource } from '@angular/cdk/table';
import { MatTableDataSource } from '@angular/material/table';
import { BehaviorSubject, combineLatest, from, Observable, of, Subscription } from 'rxjs';
import { concatMap, exhaustMap, filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { IPaginationResult } from './pagination-result.entity';

export class TableDataSource<T> extends DataSource<T> {
  private _pageCache = new Set<number>();
  private _subscription = Subscription.EMPTY;
  private _viewPort: CdkVirtualScrollViewport;
  private _total = 0;

  // Create MatTableDataSource so we can have all sort, filter bells and whistles.
  matTableDataSource = new MatTableDataSource<T>();

  // Expose dataStream to simulate VirtualForOf.dataStream.
  dataStream = this.matTableDataSource.connect().asObservable();

  renderedStream = new BehaviorSubject<T[]>([]);

  /**
   *
   * @param _pageSize If too low, only the first page will be fetched, i.e. the scroll feature will not work.
   */
  constructor(
    private _fetchPage: (pageNum: number, pageSize: number) => Observable<IPaginationResult<T>>,
    private readonly _pageSize = 50,
  ) {
    super();
  }

  attach(viewPort: CdkVirtualScrollViewport) {
    if (!viewPort) {
      throw new Error('ViewPort is not defined');
    }
    this._viewPort = viewPort;

    this.initFetchingOnScrollUpdates();

    // Attach DataSource as CdkVirtualForOf so ViewPort can access dataStream.
    this._viewPort.attach(this as any);
    // Trigger range change so that 1st page can be loaded.
    this._viewPort.setRenderedRange({ start: 0, end: 1 });
  }

  // Called by CDK Table.
  connect(): Observable<T[]> {
    const tableData = this.matTableDataSource.connect();
    const filtered = this._viewPort === undefined ? tableData : this.filterByRangeStream(tableData);

    filtered.subscribe((data) => {
      this.renderedStream.next(data);
    });

    return this.renderedStream.asObservable();
  }

  disconnect(): void {
    this._subscription.unsubscribe();
  }

  private initFetchingOnScrollUpdates() {
    this._subscription = this._viewPort.renderedRangeStream
      .pipe(
        switchMap((range) => this._getPagesToFetch(range)),
        // Is exhaust the best operator here?
        exhaustMap((page) => this._fetchAndUpdate(page)),
      )
      .subscribe();
  }

  private _getPagesToFetch({ start, end }: ListRange) {
    const firstPage = this._getPageForIndex(start);
    const lastPage = this._getPageForIndex(end + this._pageSize);
    const pages: number[] = [];
    for (let i = firstPage, maxPage = this._getPageForIndex(this._total); i <= lastPage && i <= maxPage; i++) {
      if (!this._pageCache.has(i)) {
        pages.push(i);
      }
    }
    return from(pages);
  }

  private _getPageForIndex(index: number): number {
    return Math.floor(index / this._pageSize);
  }

  private filterByRangeStream(tableData: Observable<T[]>) {
    const rangeStream = this._viewPort.renderedRangeStream.pipe(startWith({} as ListRange));
    const filtered = combineLatest([tableData, rangeStream]).pipe(
      map(([data, { start, end }]) => {
        return start === null || end === null ? data : data.slice(start, end);
      }),
    );
    return filtered;
  }

  private _fetchAndUpdate(page: number): Observable<T[]> {
    return of(page).pipe(
      filter((p) => !this._pageCache.has(p)),
      concatMap((p) => this._fetchPage(p, this._pageSize)),
      tap((result) => {
        if (this._total !== result.total) {
          this._total = result.total;
          this._viewPort.setRenderedRange({ start: 0, end: this._getPageForIndex(this._total) });
        }
      }),
      map((result) => result.data),
      tap(() => this._pageCache.add(page)),
      tap((data) => {
        const newData = [...this.matTableDataSource.data];
        newData.splice(page * this._pageSize, this._pageSize, ...data);
        this.matTableDataSource.data = newData;
      }),
    );
  }
}
