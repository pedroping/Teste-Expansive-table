import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { AfterContentInit, ContentChildren, Directive, ElementRef, Input, OnDestroy, OnInit, QueryList, Renderer2 } from '@angular/core';
import { MatHeaderCell } from '@angular/material/table';
import { merge, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { TableDataSource } from '../model/table-data-source';

@Directive({
  selector: 'cdk-virtual-scroll-viewport[appTable]',
})
export class InfiniteTableDirective implements OnInit, AfterContentInit, OnDestroy {
  @Input('appDataSource') dataSource: TableDataSource<any>;

  /**
   * Watch cdk-virtual-scroll input.
   */
  @Input() itemSize: number;

  @ContentChildren(MatHeaderCell, { read: ElementRef, descendants: true })
  headerCells: QueryList<ElementRef>;

  private invalidInput = false;
  private destroy$ = new Subject<void>();

  constructor(private render: Renderer2, private viewPort: CdkVirtualScrollViewport) {}

  ngOnInit() {
    if (!(this.dataSource && this.itemSize)) {
      this.invalidInput = true;
      throw new Error('appTable directive: data source and item size inputs must be provided.');
    }

    this.dataSource.attach(this.viewPort);
  }

  ngAfterContentInit() {
    if (this.invalidInput) {
      return;
    }

    const render$ = this.viewPort.renderedRangeStream.pipe(map((range) => range.start * -this.itemSize));
    const scroll$ = this.viewPort.scrolledIndexChange.pipe(
      map(() => this.viewPort.getOffsetToRenderedContentStart() * -1),
      distinctUntilChanged(),
    );
    merge(scroll$, render$)
      .pipe(takeUntil(this.destroy$))
      .subscribe((offset) => {
        this.headerCells.forEach((h) => this.render.setStyle(h.nativeElement, 'top', `${offset}px`));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
